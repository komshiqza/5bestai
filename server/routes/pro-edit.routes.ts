import type { Express } from "express";
import { db } from "../db";
import { images, editJobs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "../storage";
import {
  authenticateToken,
  type AuthRequest,
} from "../middleware/auth";
import { upload, uploadFile } from "../services/file-upload";
import * as replicate from "../replicate";

/**
 * Pro Edit and Canvas Routes
 * Handles image editing, canvas operations, and version management
 */
export function registerProEditRoutes(app: Express): void {
  // POST /api/canvas/save-version - Save canvas version
  app.post(
    "/api/canvas/save-version",
    upload.single("image"),
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const { imageId } = req.body;

        if (!req.file) {
          return res.status(400).json({ error: "No image file provided" });
        }

        if (!imageId) {
          return res.status(400).json({ error: "Image ID is required" });
        }

        // Upload to Cloudinary
        const uploadResult = await uploadFile(req.file);

        res.json({
          message: "Canvas version saved successfully",
          url: uploadResult.url,
          cloudinaryPublicId: uploadResult.cloudinaryPublicId,
        });
      } catch (error) {
        console.error("[Canvas] Error saving canvas version:", error);
        res.status(500).json({
          error:
            error instanceof Error
              ? error.message
              : "Failed to save canvas version",
        });
      }
    },
  );

  // GET /api/edit-jobs/:id - Get edit job status
  app.get(
    "/api/edit-jobs/:id",
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const jobId = req.params.id;

        const job = await storage.getEditJob(jobId);

        if (!job) {
          return res.status(404).json({ error: "Job not found" });
        }

        // Verify ownership
        if (job.userId !== userId && req.user!.role !== "admin") {
          return res.status(403).json({ error: "Access denied" });
        }

        // If job is still running, check Replicate status
        if (job.status === "running" && job.replicatePredictionId) {
          const prediction = await replicate.getPrediction(
            job.replicatePredictionId,
          );

          if (prediction.status === "succeeded") {
            // Get output URL (it's an array for some models)
            const outputUrl = Array.isArray(prediction.output)
              ? prediction.output[0]
              : prediction.output;

            // Create output version
            const outputVersion = await storage.createImageVersion({
              imageId: job.imageId,
              url: outputUrl,
              source: "edit",
              preset: job.preset,
              params: job.params || {},
            });

            // Update job
            await storage.updateEditJob(jobId, {
              status: "succeeded",
              outputVersionId: outputVersion.id,
              finishedAt: new Date(),
            });

            // Update image current version
            await storage.updateImage(job.imageId, {
              currentVersionId: outputVersion.id,
            });

            job.status = "succeeded";
            job.outputVersionId = outputVersion.id;
            job.finishedAt = new Date();
          } else if (prediction.status === "failed") {
            const errorMessage =
              (prediction.error as string) || "Processing failed";
            const MAX_RETRIES = 2;

            // Check if we should retry (same logic as webhook)
            if (job.retryCount < MAX_RETRIES) {
              console.log(
                `[ProEdit] Polling detected failure for job ${job.id} (retry ${job.retryCount + 1}/${MAX_RETRIES}):`,
                errorMessage,
              );

              // Get image to retry with original URL
              const image = await storage.getImage(job.imageId);
              if (image) {
                // Create new Replicate prediction for retry using original image URL
                const webhookUrl = `https://${req.get("host")}/api/replicate-webhook`;
                const newPrediction = await replicate.createPrediction(
                  job.preset as any,
                  image.originalUrl,
                  job.params || {},
                  webhookUrl,
                );

                // Update job with new prediction ID, increment retry count
                await storage.updateEditJob(jobId, {
                  replicatePredictionId: newPrediction.id,
                  retryCount: job.retryCount + 1,
                  lastAttemptAt: new Date(),
                  error: `Previous attempt failed: ${errorMessage}. Retrying...`,
                });

                job.retryCount = job.retryCount + 1;
                job.error = `Previous attempt failed: ${errorMessage}. Retrying...`;

                console.log(
                  `[ProEdit] Job ${job.id} retrying with new prediction: ${newPrediction.id}`,
                );
              }
            } else {
              // Max retries reached, mark as permanently failed and refund
              await storage.updateEditJob(jobId, {
                status: "failed",
                error: `Failed after ${MAX_RETRIES} retries: ${errorMessage}`,
                finishedAt: new Date(),
              });

              // Refund credits since job failed permanently
              await storage.refundAiCredits(
                job.userId,
                job.costCredits,
                `Job ${job.id} failed permanently after ${MAX_RETRIES} retries (detected via polling)`,
                job.id,
              );

              job.status = "failed";
              job.error = `Failed after ${MAX_RETRIES} retries: ${errorMessage}`;
              job.finishedAt = new Date();

              console.log(
                `[ProEdit] Job ${job.id} permanently failed after ${MAX_RETRIES} retries (polling)`,
              );
            }
          }
        }

        // Fetch output version if available
        let outputVersion = null;
        if (job.outputVersionId) {
          outputVersion = await storage.getImageVersion(job.outputVersionId);
        }

        // Fetch image to get original URL
        const image = await storage.getImage(job.imageId);
        if (!image) {
          return res.status(404).json({ error: "Image not found" });
        }

        res.json({
          ...job,
          outputUrl: outputVersion?.url || null,
          originalUrl: image.originalUrl,
        });
      } catch (error) {
        console.error("[ProEdit] Error fetching job status:", error);
        res.status(500).json({
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch job status",
        });
      }
    },
  );

  // GET /api/pro-edit/image-id - Get imageId for submission or generation
  app.get(
    "/api/pro-edit/image-id",
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const { submissionId, generationId } = req.query;

        if (!submissionId && !generationId) {
          return res
            .status(400)
            .json({ error: "submissionId or generationId required" });
        }

        // Find image by submissionId or generationId
        let image = null;
        if (submissionId) {
          const imgs = await db
            .select()
            .from(images)
            .where(eq(images.submissionId, submissionId as string))
            .limit(1);
          image = imgs[0];
        } else if (generationId) {
          const imgs = await db
            .select()
            .from(images)
            .where(eq(images.generationId, generationId as string))
            .limit(1);
          image = imgs[0];
        }

        // If no image found, return null (not an error - just means no edits yet)
        if (!image) {
          return res.json({ imageId: null });
        }

        // Verify ownership
        if (image.userId !== userId && req.user!.role !== "admin") {
          return res.status(403).json({ error: "Access denied" });
        }

        res.json({ imageId: image.id });
      } catch (error) {
        console.error("[ProEdit] Error fetching imageId:", error);
        res.status(500).json({
          error:
            error instanceof Error ? error.message : "Failed to fetch imageId",
        });
      }
    },
  );

  // GET /api/images/:imageId/versions - Get all versions for an image
  app.get(
    "/api/images/:imageId/versions",
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const imageId = req.params.imageId;

        // Get image to verify ownership
        const image = await storage.getImage(imageId);
        if (!image) {
          return res.status(404).json({ error: "Image not found" });
        }

        // Verify ownership
        if (image.userId !== userId && req.user!.role !== "admin") {
          return res.status(403).json({ error: "Access denied" });
        }

        // Get all versions for this image
        const versions = await storage.getImageVersionsByImageId(imageId);

        res.json({ versions });
      } catch (error) {
        console.error("[ProEdit] Error fetching image versions:", error);
        res.status(500).json({
          error:
            error instanceof Error ? error.message : "Failed to fetch versions",
        });
      }
    },
  );

  // GET /api/images/:imageId/current-url - Get current version URL for an image
  app.get(
    "/api/images/:imageId/current-url",
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const imageId = req.params.imageId;

        // Get image to verify ownership
        const image = await storage.getImage(imageId);
        if (!image) {
          return res.status(404).json({ error: "Image not found" });
        }

        // Verify ownership
        if (image.userId !== userId && req.user!.role !== "admin") {
          return res.status(403).json({ error: "Access denied" });
        }

        // Get current version
        const currentVersion = await storage.getCurrentImageVersion(imageId);

        // Return current version URL if exists, otherwise original URL
        const currentUrl = currentVersion?.url || image.originalUrl;

        res.json({ url: currentUrl, isCurrent: !!currentVersion });
      } catch (error) {
        console.error("[ProEdit] Error fetching current URL:", error);
        res.status(500).json({
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch current URL",
        });
      }
    },
  );

  // Timeout guard - check for stalled jobs periodically
  const TIMEOUT_MINUTES = 10;
  const checkStalledJobs = async () => {
    try {
      const timeoutThreshold = new Date(
        Date.now() - TIMEOUT_MINUTES * 60 * 1000,
      );

      // Find jobs that are running but last attempt was too long ago
      const stalledJobs = await db
        .select()
        .from(editJobs)
        .where(eq(editJobs.status, "running"));

      for (const job of stalledJobs) {
        // Check lastAttemptAt instead of createdAt to allow retries
        if (new Date(job.lastAttemptAt) < timeoutThreshold) {
          console.log(
            `[ProEdit] Timeout guard: Job ${job.id} exceeded ${TIMEOUT_MINUTES} minute limit since last attempt`,
          );

          await storage.updateEditJob(job.id, {
            status: "failed",
            error: `Timeout: Job exceeded ${TIMEOUT_MINUTES} minute processing limit`,
            finishedAt: new Date(),
          });

          // Refund credits since job timed out
          await storage.refundAiCredits(
            job.userId,
            job.costCredits,
            `Job ${job.id} timed out after ${TIMEOUT_MINUTES} minutes`,
            job.id,
          );
        }
      }
    } catch (error) {
      console.error("[ProEdit] Error checking stalled jobs:", error);
    }
  };

  // Run timeout guard every 2 minutes
  setInterval(checkStalledJobs, 2 * 60 * 1000);
  // Run once on startup
  checkStalledJobs();
}





import type { Express } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { eq } from "drizzle-orm";
import {
  editJobs,
  imageVersions,
} from "@shared/schema";
import * as replicate from "../replicate";
import { uploadImageToSupabase } from "../supabase";

/**
 * Webhook Routes
 * Handles callbacks from external services (Replicate AI)
 */
export function registerWebhookRoutes(app: Express): void {
  // POST /api/replicate-webhook - Webhook from Replicate AI service
  app.post("/api/replicate-webhook", async (req, res) => {
    try {
      const prediction = req.body;
      console.log(
        `[ProEdit] Webhook received for prediction: ${prediction.id}, status: ${prediction.status}`,
      );

      // Find job by prediction ID
      const jobs = await db
        .select()
        .from(editJobs)
        .where(eq(editJobs.replicatePredictionId, prediction.id))
        .limit(1);

      const job = jobs[0];

      if (!job) {
        console.log(`[ProEdit] No job found for prediction: ${prediction.id}`);
        return res.json({ received: true });
      }

      if (prediction.status === "succeeded") {
        // Get output URL from Replicate
        const replicateOutputUrl = Array.isArray(prediction.output)
          ? prediction.output[0]
          : prediction.output;

        console.log(`[ProEdit] Replicate output URL: ${replicateOutputUrl}`);

        // Get image details
        const image = await storage.getImage(job.imageId);
        if (!image) {
          throw new Error(`Image not found: ${job.imageId}`);
        }

        // Generate version ID
        const versionId = `v${Date.now()}`;

        // Upload to Supabase Storage
        const { url: supabaseUrl } = await uploadImageToSupabase(
          replicateOutputUrl,
          image.userId,
          job.imageId,
          versionId,
        );

        console.log(`[ProEdit] Uploaded to Supabase: ${supabaseUrl}`);

        // Use Supabase URL directly as thumbnail (no Cloudinary upload needed)
        const thumbnailUrl = supabaseUrl;
        console.log(`[ProEdit] Thumbnail URL: ${thumbnailUrl}`);

        // Create output version with Supabase URL and mark as current
        // First unset all other versions for this image
        await db
          .update(imageVersions)
          .set({ isCurrent: false })
          .where(eq(imageVersions.imageId, job.imageId));

        // Then create the new version with isCurrent=true
        const [outputVersion] = await db
          .insert(imageVersions)
          .values({
            imageId: job.imageId,
            url: supabaseUrl,
            thumbnailUrl: thumbnailUrl,
            source: "edit",
            preset: job.preset,
            params: job.params || {},
            isCurrent: true,
          })
          .returning();

        // Update job
        await storage.updateEditJob(job.id, {
          status: "succeeded",
          outputVersionId: outputVersion.id,
          finishedAt: new Date(),
        });

        // Update image current version
        await storage.updateImage(job.imageId, {
          currentVersionId: outputVersion.id,
        });

        console.log(`[ProEdit] Job ${job.id} completed successfully`);
      } else if (prediction.status === "failed") {
        const errorMessage =
          (prediction.error as string) || "Processing failed";
        const MAX_RETRIES = 2;

        // Check if we should retry
        if (job.retryCount < MAX_RETRIES) {
          console.log(
            `[ProEdit] Job ${job.id} failed (retry ${job.retryCount + 1}/${MAX_RETRIES}):`,
            errorMessage,
          );

          // Get image to retry with original URL
          const image = await storage.getImage(job.imageId);
          if (!image) {
            throw new Error(`Image not found: ${job.imageId}`);
          }

          // Create new Replicate prediction for retry using original image URL
          const webhookUrl = `https://${req.get("host")}/api/replicate-webhook`;
          const newPrediction = await replicate.createPrediction(
            job.preset as any,
            image.originalUrl,
            job.params || {},
            webhookUrl,
          );

          // Update job with new prediction ID, increment retry count, and refresh timestamp
          await storage.updateEditJob(job.id, {
            replicatePredictionId: newPrediction.id,
            retryCount: job.retryCount + 1,
            lastAttemptAt: new Date(), // Refresh timestamp to prevent timeout guard from canceling retry
            error: `Previous attempt failed: ${errorMessage}. Retrying...`,
          });

          console.log(
            `[ProEdit] Job ${job.id} retrying with new prediction: ${newPrediction.id}`,
          );
        } else {
          // Max retries reached, mark as permanently failed
          await storage.updateEditJob(job.id, {
            status: "failed",
            error: `Failed after ${MAX_RETRIES} retries: ${errorMessage}`,
            finishedAt: new Date(),
          });

          // Refund credits since job failed permanently
          await storage.refundAiCredits(
            job.userId,
            job.costCredits,
            `Job ${job.id} failed permanently after ${MAX_RETRIES} retries`,
            job.id,
          );

          console.log(
            `[ProEdit] Job ${job.id} permanently failed after ${MAX_RETRIES} retries`,
          );
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error("[ProEdit] Webhook error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });
}

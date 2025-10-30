import type { Express } from "express";
import { storage } from "../storage";
import {
  authenticateToken,
  type AuthRequest,
} from "../middleware/auth";
import * as replicate from "../replicate";
import { db } from "../db";
import { images, imageVersions } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Image Edit Routes
 * Handles AI-powered image editing operations
 */
export function registerEditRoutes(app: Express): void {
  // POST /api/edits - Create new edit job
  app.post("/api/edits", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { imageUrl, preset, submissionId, generationId } = req.body;

      console.log(
        `[ProEdit] Creating edit job for user ${userId}, preset: ${preset}`,
      );

      // Validate preset
      if (!replicate.isValidPreset(preset)) {
        return res.status(400).json({ error: "Invalid preset" });
      }

      const presetInfo = replicate.getPresetInfo(preset);

      // Determine dynamic credit cost: prefer Admin-configured pricing, fallback to preset default
      let costCredits = await storage.getPricingSetting(preset);
      if (costCredits === undefined || costCredits === null) {
        costCredits = presetInfo.credits;
      }

      // Check user has enough credits
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.imageCredits < costCredits) {
        return res.status(402).json({
          error: "Insufficient credits",
          required: costCredits,
          available: user.imageCredits,
        });
      }

      // Deduct credits atomically (DB impl) or fallback to direct update
      try {
        const deducted = await storage.deductCredits(userId, costCredits);
        if (!deducted) {
          return res.status(402).json({
            error: "Insufficient credits",
            required: costCredits,
            available: user.imageCredits,
          });
        }
      } catch {
        // Fallback for storage implementations without deductCredits
        await storage.updateUser(userId, {
          imageCredits: user.imageCredits - costCredits,
        });
      }

      // Find or create image record
      let image = null;

      // First, try to find existing image by generationId or submissionId
      if (generationId) {
        const imgs = await db
          .select()
          .from(images)
          .where(eq(images.generationId, generationId))
          .limit(1);
        image = imgs[0];
        console.log(`[ProEdit] Searched for image by generationId: ${generationId}, found: ${!!image}`);
      } else if (submissionId) {
        const imgs = await db
          .select()
          .from(images)
          .where(eq(images.submissionId, submissionId))
          .limit(1);
        image = imgs[0];
        console.log(`[ProEdit] Searched for image by submissionId: ${submissionId}, found: ${!!image}`);
      }

      // If not found, create new image record
      if (!image) {
        image = await storage.createImage({
          userId,
          submissionId: submissionId || null,
          generationId: generationId || null,
          originalUrl: imageUrl,
          currentVersionId: null,
        });
        console.log(`[ProEdit] Created new image record: ${image.id}`);

        // Create original version (so we have complete history)
        const [originalVersion] = await db
          .insert(imageVersions)
          .values({
            imageId: image.id,
            url: imageUrl,
            thumbnailUrl: imageUrl,
            source: "original",
            preset: null,
            params: {},
            isCurrent: true,  // Initially current
          })
          .returning();

        // Update image currentVersionId
        await storage.updateImage(image.id, {
          currentVersionId: originalVersion.id,
        });

        console.log(`[ProEdit] Created original version: ${originalVersion.id}`);
      } else {
        console.log(`[ProEdit] Using existing image record: ${image.id}`);
      }

      // Create Replicate prediction
      // Force HTTPS for webhook URL (Replicate requires HTTPS)
      const webhookUrl = `https://${req.get("host")}/api/replicate-webhook`;
      console.log(`[ProEdit] Webhook URL: ${webhookUrl}`);

      const prediction = await replicate.createPrediction(
        preset,
        imageUrl,
        {},
        webhookUrl,
      );

      // Create edit job (no inputVersionId - we only create the edited version)
      const job = await storage.createEditJob({
        userId,
        imageId: image.id,
        inputVersionId: null,
        preset,
        params: {},
        status: "running",
        replicatePredictionId: prediction.id,
        outputVersionId: null,
        costCredits: costCredits,
      });

      console.log(
        `[ProEdit] Job ${job.id} created, prediction: ${prediction.id}`,
      );

      // Fetch up-to-date remaining credits
      const remainingCredits = await storage.getUserCredits(userId).catch(() => {
        return Math.max(0, user.imageCredits - costCredits);
      });

      res.json({
        jobId: job.id,
        imageId: image.id,
        predictionId: prediction.id,
        status: "running",
        creditsDeducted: costCredits,
        remainingCredits,
      });
    } catch (error) {
      console.error("[ProEdit] Error creating edit job:", error);
      res.status(500).json({
        error:
          error instanceof Error ? error.message : "Failed to create edit job",
      });
    }
  });

}

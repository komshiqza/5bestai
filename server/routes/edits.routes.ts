import type { Express } from "express";
import { storage } from "../storage";
import {
  authenticateToken,
  type AuthRequest,
} from "../middleware/auth";
import * as replicate from "../replicate";

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

      // Check user has enough credits
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.imageCredits < presetInfo.credits) {
        return res.status(402).json({
          error: "Insufficient credits",
          required: presetInfo.credits,
          available: user.imageCredits,
        });
      }

      // Deduct credits
      await storage.updateUser(userId, {
        imageCredits: user.imageCredits - presetInfo.credits,
      });

      // Create image record (or get existing)
      const image = await storage.createImage({
        userId,
        submissionId: submissionId || null,
        generationId: generationId || null,
        originalUrl: imageUrl,
        currentVersionId: null,
      });

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
        costCredits: presetInfo.credits,
      });

      console.log(
        `[ProEdit] Job ${job.id} created, prediction: ${prediction.id}`,
      );

      res.json({
        jobId: job.id,
        imageId: image.id,
        predictionId: prediction.id,
        status: "running",
        creditsDeducted: presetInfo.credits,
        remainingCredits: user.imageCredits - presetInfo.credits,
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

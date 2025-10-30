import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import {
  authenticateToken,
  requireApproved,
  type AuthRequest,
} from "../middleware/auth";
import { upload, uploadFile } from "../services/file-upload";

/**
 * AI Generation Routes
 * Handles AI image generation, upscaling, and submission to contests
 */
export function registerAiGenerationRoutes(app: Express): void {
  // Rate limiter for AI generation (30 per hour)
  const aiGenerationRateLimiter = async (req: AuthRequest) => {
    const userId = req.user?.id;
    if (!userId) return false;
    
    const key = `ai-gen:${userId}`;
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    
    // Simple in-memory rate limiting (in production, use Redis)
    if (!global.rateLimitStore) {
      global.rateLimitStore = new Map();
    }
    
    let timestamps = global.rateLimitStore.get(key) || [];
    timestamps = timestamps.filter((t: number) => t > hourAgo);
    
    if (timestamps.length >= 30) {
      return false;
    }
    
    timestamps.push(now);
    global.rateLimitStore.set(key, timestamps);
    return true;
  };

  // Helper function to map model to pricing key
  const modelToPricingKey = (modelId: string): string => {
    const mapping: Record<string, string> = {
      "leonardo-lucid": "leonardo",
      "ideogram-v3": "ideogram-v3",
      "nano-banana": "nano-banana",
      "flux-1.1-pro": "flux-1.1-pro",
      "sd-3.5-large": "sd-3.5-large",
    };
    return mapping[modelId] || modelId;
  };

  // POST /api/ai/generate - Generate AI images
  app.post(
    "/api/ai/generate",
    authenticateToken,
    requireApproved,
    async (req: AuthRequest, res) => {
      // Check rate limit
      const canGenerate = await aiGenerationRateLimiter(req);
      if (!canGenerate) {
        return res
          .status(429)
          .json({
            error: "Rate limit exceeded. Maximum 30 generations per hour.",
          });
      }
      try {
        const generateImageSchema = z.object({
          prompt: z.string().min(1).max(2000),
          model: z.enum([
            "ideogram-v3",
            "nano-banana",
            "flux-1.1-pro",
            "sd-3.5-large",
            "leonardo-lucid",
          ]).optional(),
          numImages: z.number().min(1).max(4).optional(),
          width: z.number().optional(),
          height: z.number().optional(),
          aspectRatio: z.string().optional(),
        });

        const params = generateImageSchema.parse(req.body);
        const userId = req.user!.id;
        const modelId = params.model || "flux-1.1-pro";

        // Auto-refresh subscription credits if period has expired
        try {
          await storage.refreshSubscriptionIfNeeded(userId);
        } catch (error) {
          console.error(
            "Failed to refresh subscription in AI generation:",
            error,
          );
        }

        // Check tier-based model access
        const hasModelAccess = await storage.canUserAccessModel(
          userId,
          modelId,
        );
        if (!hasModelAccess) {
          return res.status(403).json({
            error:
              "Your subscription tier does not have access to this AI model. Please upgrade your plan to use this model.",
            model: modelId,
          });
        }

        // Get model cost from pricing settings using pricing key
        const pricingKey = modelToPricingKey(modelId);
        const modelCost = await storage.getPricingSetting(pricingKey);
        if (!modelCost) {
          return res
            .status(500)
            .json({ error: "Model pricing not configured" });
        }

        // Calculate total cost (multiply by numImages if provided)
        const numImages = params.numImages || 1;
        const totalCost = modelCost * numImages;

        // Check if user has enough credits
        const userCredits = await storage.getUserCredits(userId);
        if (userCredits < totalCost) {
          return res.status(402).json({
            error: "Insufficient credits",
            required: totalCost,
            current: userCredits,
          });
        }

        console.log(`Generating AI image for user ${userId}:`, params.prompt);

        // Deduct credits BEFORE generation
        const deducted = await storage.deductCredits(userId, totalCost);
        if (!deducted) {
          return res.status(402).json({ error: "Failed to deduct credits" });
        }

        try {
          // Generate image(s) using Replicate (returns array)
          const { generateImage } = await import("../ai-service");
          const results = await generateImage({ ...params, userId });

          // Guard against empty results
          if (!results || results.length === 0) {
            await storage.addCredits(userId, totalCost);
            throw new Error("No images were generated");
          }

          // If we got fewer images than requested, refund the difference
          const actualCost = modelCost * results.length;
          if (actualCost < totalCost) {
            const refundAmount = totalCost - actualCost;
            await storage.addCredits(userId, refundAmount);
          }

          // Calculate credits per image based on actual results
          const creditsPerImage = modelCost;

          // Save all generations to database
          const generations = await Promise.all(
            results.map((result: any) =>
              storage.createAiGeneration({
                userId,
                prompt: params.prompt,
                model: result.parameters.model,
                imageUrl: result.url,
                thumbnailUrl: result.thumbnailUrl,
                parameters: result.parameters,
                cloudinaryPublicId: result.cloudinaryPublicId,
                storageBucket: result.storageBucket,
                status: "generated",
                creditsUsed: creditsPerImage,
              }),
            ),
          );

          // Return all generated images using data from database records
          res.json({
            images: generations.map((gen) => ({
              id: gen.id,
              imageUrl: gen.imageUrl,
              cloudinaryUrl: gen.imageUrl, // Already points to Cloudinary if upload succeeded
              cloudinaryPublicId: gen.cloudinaryPublicId,
              parameters: gen.parameters,
            })),
            creditsUsed: actualCost,
            creditsRemaining: userCredits - actualCost,
          });
        } catch (generationError) {
          // Refund credits if generation failed
          await storage.addCredits(userId, totalCost);
          throw generationError;
        }
      } catch (error) {
        console.error("AI generation error:", error);
        if (error instanceof z.ZodError) {
          return res
            .status(400)
            .json({ error: "Invalid parameters", details: error.errors });
        }
        res.status(500).json({
          error:
            error instanceof Error ? error.message : "Failed to generate image",
        });
      }
    },
  );

  // GET /api/ai/generations - List user's AI generations
  app.get(
    "/api/ai/generations",
    authenticateToken,
    requireApproved,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const { limit = 20 } = req.query;

        const generations = await storage.getAiGenerations(
          userId,
          parseInt(limit as string),
        );
        res.json(generations);
      } catch (error) {
        console.error("Error fetching AI generations:", error);
        res.status(500).json({ error: "Failed to fetch generations" });
      }
    },
  );

  // GET /api/ai/generations/:id - Get specific generation
  app.get(
    "/api/ai/generations/:id",
    authenticateToken,
    requireApproved,
    async (req: AuthRequest, res) => {
      try {
        const { id } = req.params;
        const userId = req.user!.id;

        const generation = await storage.getAiGeneration(id);
        if (!generation) {
          return res.status(404).json({ error: "Generation not found" });
        }

        if (generation.userId !== userId) {
          return res
            .status(403)
            .json({ error: "Not authorized to access this generation" });
        }

        res.json(generation);
      } catch (error) {
        console.error("Error fetching AI generation:", error);
        res.status(500).json({ error: "Failed to fetch generation" });
      }
    },
  );

  // DELETE /api/ai/generations/:id - Delete generation
  app.delete(
    "/api/ai/generations/:id",
    authenticateToken,
    requireApproved,
    async (req: AuthRequest, res) => {
      try {
        const { id } = req.params;
        const userId = req.user!.id;

        const generation = await storage.getAiGeneration(id);
        if (!generation) {
          return res.status(404).json({ error: "Generation not found" });
        }

        if (generation.userId !== userId) {
          return res
            .status(403)
            .json({ error: "Not authorized to delete this generation" });
        }

        await storage.deleteAiGeneration(id);
        res.json({ message: "Generation deleted successfully" });
      } catch (error) {
        console.error("Error deleting AI generation:", error);
        res.status(500).json({ error: "Failed to delete generation" });
      }
    },
  );

  // POST /api/ai/generations/:id/submit-to-contest - Submit to contest
  app.post(
    "/api/ai/generations/:id/submit-to-contest",
    authenticateToken,
    requireApproved,
    async (req: AuthRequest, res) => {
      try {
        const submitToContestSchema = z.object({
          contestId: z.string(),
          title: z.string().min(1, "Title is required").max(255),
          description: z.string().optional(),
          tags: z.array(z.string()).optional(),
        });

        const { id } = req.params;
        const userId = req.user!.id;
        const params = submitToContestSchema.parse(req.body);

        // Get AI generation
        const generation = await storage.getAiGeneration(id);
        if (!generation) {
          return res.status(404).json({ error: "AI generation not found" });
        }

        if (generation.userId !== userId) {
          return res
            .status(403)
            .json({ error: "Not authorized to submit this generation" });
        }

        if (!generation.cloudinaryPublicId) {
          return res
            .status(400)
            .json({ error: "Image not properly uploaded to storage" });
        }

        // Get contest
        const contest = await storage.getContest(params.contestId);
        if (!contest) {
          return res.status(404).json({ error: "Contest not found" });
        }

        if (contest.status !== "active") {
          return res.status(400).json({ error: "Contest is not active" });
        }

        // Check contest type matches (AI images are always image type)
        const config = contest.config as any;
        if (config?.contestType && config.contestType !== "image") {
          return res
            .status(400)
            .json({ error: "This contest does not accept images" });
        }

        // Create submission from AI generation
        const submission = await storage.createSubmission({
          userId,
          contestId: params.contestId,
          contestName: contest.title,
          type: "image",
          title: params.title,
          description: params.description,
          mediaUrl: generation.imageUrl,
          cloudinaryPublicId: generation.cloudinaryPublicId,
          cloudinaryResourceType: "image",
          tags: params.tags,
          status: "pending", // Will need admin approval
        });

        // Note: AI generation status remains as "generated" - we don't update it
        // The submission itself tracks the contest entry

        res.json({
          message: "Successfully submitted to contest",
          submission,
        });
      } catch (error) {
        console.error("Error submitting AI generation to contest:", error);
        if (error instanceof z.ZodError) {
          return res
            .status(400)
            .json({ error: "Invalid parameters", details: error.errors });
        }
        res.status(500).json({ error: "Failed to submit to contest" });
      }
    },
  );

  // POST /api/ai/upscale - Upscale AI generation
  app.post(
    "/api/ai/upscale",
    authenticateToken,
    requireApproved,
    async (req: AuthRequest, res) => {
      try {
        const upscaleSchema = z.object({
          generationId: z.string(),
          scale: z.number().min(2).max(10).optional(),
          faceEnhance: z.boolean().optional(),
        });

        const userId = req.user!.id;
        const params = upscaleSchema.parse(req.body);

        // Auto-refresh subscription credits if period has expired
        try {
          await storage.refreshSubscriptionIfNeeded(userId);
        } catch (error) {
          console.error("Failed to refresh subscription in upscale:", error);
        }

        // Check tier-based upscale permission
        const canUpscale = await storage.canUserUpscale(userId);
        if (!canUpscale) {
          return res.status(403).json({
            error:
              "Your subscription tier does not have access to AI upscaling. Please upgrade your plan to use this feature.",
          });
        }

        // Get AI generation
        const generation = await storage.getAiGeneration(params.generationId);
        if (!generation) {
          return res.status(404).json({ error: "AI generation not found" });
        }

        if (generation.userId !== userId) {
          return res
            .status(403)
            .json({ error: "Not authorized to upscale this generation" });
        }

        if (generation.isUpscaled) {
          return res
            .status(400)
            .json({ error: "This image has already been upscaled" });
        }

        // Get upscale cost from pricing settings
        const upscaleCost = await storage.getPricingSetting("upscale");
        if (!upscaleCost) {
          return res
            .status(500)
            .json({ error: "Upscaling pricing not configured" });
        }

        // Check if user has enough credits
        const userCredits = await storage.getUserCredits(userId);
        if (userCredits < upscaleCost) {
          return res.status(402).json({
            error: `Insufficient credits. Upscaling costs ${upscaleCost} credits. You have ${userCredits} credits.`,
          });
        }

        // Deduct credits before upscaling
        await storage.deductCredits(userId, upscaleCost);

        let upscaledImageUrl: string;
        let thumbnailUrl: string | undefined;
        let cloudinaryPublicId: string | null | undefined;

        try {
          // Call upscaling service
          const { upscaleImage } = await import("../ai-service");
          const result = await upscaleImage(generation.imageUrl, {
            scale: params.scale,
            faceEnhance: params.faceEnhance,
            userId,
          });

          upscaledImageUrl = result.url;
          thumbnailUrl = result.thumbnailUrl;
          cloudinaryPublicId = result.cloudinaryPublicId;

          // Update generation record with upscaled image and its thumbnail
          await storage.updateAiGeneration(params.generationId, {
            editedImageUrl: upscaledImageUrl,
            thumbnailUrl: thumbnailUrl, // Update thumbnail to point to upscaled version
            isUpscaled: true,
            creditsUsed: generation.creditsUsed + upscaleCost,
          });

          const updatedCredits = await storage.getUserCredits(userId);

          res.json({
            message: "Image upscaled successfully",
            upscaledImageUrl,
            cloudinaryPublicId,
            creditsUsed: upscaleCost,
            creditsRemaining: updatedCredits,
          });
        } catch (error) {
          // Refund credits if upscaling failed
          await storage.addCredits(userId, upscaleCost);
          throw error;
        }
      } catch (error) {
        console.error("Error upscaling image:", error);
        if (error instanceof z.ZodError) {
          return res
            .status(400)
            .json({ error: "Invalid parameters", details: error.errors });
        }
        res.status(500).json({
          error:
            error instanceof Error ? error.message : "Failed to upscale image",
        });
      }
    },
  );

  // POST /api/ai/save-edited - Save edited AI image
  app.post(
    "/api/ai/save-edited",
    upload.single("image"),
    authenticateToken,
    requireApproved,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const { generationId } = req.body;

        // Check tier-based edit permission
        const canEdit = await storage.canUserEdit(userId);
        if (!canEdit) {
          return res.status(403).json({
            error:
              "Your subscription tier does not have access to image editing. Please upgrade your plan to use this feature.",
          });
        }

        if (!req.file) {
          return res.status(400).json({ error: "No image file provided" });
        }

        if (!generationId) {
          return res.status(400).json({ error: "Generation ID is required" });
        }

        // Get AI generation
        const generation = await storage.getAiGeneration(generationId);
        if (!generation) {
          return res.status(404).json({ error: "AI generation not found" });
        }

        if (generation.userId !== userId) {
          return res
            .status(403)
            .json({ error: "Not authorized to edit this generation" });
        }

        // Upload edited image to Cloudinary
        const uploadResult = await uploadFile(req.file);

        // Update generation record
        await storage.updateAiGeneration(generationId, {
          editedImageUrl: uploadResult.url,
          isEdited: true,
        });

        res.json({
          message: "Edited image saved successfully",
          url: uploadResult.url,
          cloudinaryPublicId: uploadResult.cloudinaryPublicId,
        });
      } catch (error) {
        console.error("Error saving edited image:", error);
        res.status(500).json({
          error:
            error instanceof Error
              ? error.message
              : "Failed to save edited image",
        });
      }
    },
  );
}





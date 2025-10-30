import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import {
  authenticateToken,
  requireAdmin,
  type AuthRequest,
} from "../middleware/auth";

export async function registerSettingsRoutes(app: Express): Promise<void> {
  // GET /api/admin/settings/pricing - Get all pricing settings
  app.get(
    "/api/admin/settings/pricing",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const allPricing = await storage.getAllPricingSettings();
        const pricingObject: Record<string, number> = {};
        allPricing.forEach((value, key) => {
          pricingObject[key] = value;
        });
        res.json(pricingObject);
      } catch (error) {
        console.error("Error fetching pricing settings:", error);
        res.status(500).json({ error: "Failed to fetch pricing settings" });
      }
    },
  );

  // PUT /api/admin/settings/pricing/:key - Update pricing for a specific model
  app.put(
    "/api/admin/settings/pricing/:key",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const { key } = req.params;
        const { value } = z
          .object({ value: z.number().min(0) })
          .parse(req.body);

        await storage.updatePricingSetting(key, value);
        res.json({ success: true, key, value });
      } catch (error) {
        console.error("Error updating pricing:", error);
        if (error instanceof z.ZodError) {
          return res
            .status(400)
            .json({ error: "Invalid value", details: error.errors });
        }
        res.status(500).json({ error: "Failed to update pricing" });
      }
    },
  );

  // GET /api/admin/settings - Get current site settings
  app.get(
    "/api/admin/settings",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const settings = await storage.getSiteSettings();
        res.json(settings);
      } catch (error) {
        console.error("Error fetching settings:", error);
        res.status(500).json({ error: "Failed to fetch settings" });
      }
    },
  );

  // PATCH /api/admin/settings - Update site settings
  app.patch(
    "/api/admin/settings",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const updates = req.body;
        const updatedSettings = await storage.updateSiteSettings(updates);
        res.json(updatedSettings);
      } catch (error) {
        console.error("Error updating settings:", error);
        res.status(500).json({ error: "Failed to update settings" });
      }
    },
  );

  // GET /api/settings/private-mode - Get private mode status
  app.get("/api/settings/private-mode", async (req, res) => {
    try {
      const settings = await storage.getSiteSettings();
      res.json({ privateMode: settings.privateMode });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch private mode status" });
    }
  });

  // GET /api/settings/platform-wallet - Get platform wallet address
  app.get("/api/settings/platform-wallet", async (req, res) => {
    try {
      const settings = await storage.getSiteSettings();
      res.json({
        platformWalletAddress: settings.platformWalletAddress || null,
      });
    } catch (error) {
      res
        .status(500)
        .json({ error: "Failed to fetch platform wallet address" });
    }
  });

  // GET /api/placeholder/video-thumbnail - Placeholder for video thumbnails
  app.get("/api/placeholder/video-thumbnail", (req, res) => {
    const svg = `
      <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1a1a1a"/>
        <circle cx="200" cy="200" r="60" fill="#7C3CEC" opacity="0.8"/>
        <polygon points="180,170 180,230 230,200" fill="white"/>
        <text x="200" y="280" text-anchor="middle" fill="#666" font-family="Arial" font-size="16">Video Thumbnail</text>
      </svg>
    `;

    res.setHeader("Content-Type", "image/svg+xml");
    res.send(svg);
  });

  // AI Models routes
  const { AI_MODELS } = await import("../ai-service");

  // GET /api/ai/models - Get available AI models
  app.get("/api/ai/models", (req, res) => {
    const models = Object.values(AI_MODELS).map((model) => ({
      id: model.id,
      name: model.name,
      description: model.description,
      costPerImage: model.costPerImage,

      // All capability flags
      supportsAspectRatio: model.supportsAspectRatio,
      supportsCustomDimensions: model.supportsCustomDimensions,
      supportsResolution: model.supportsResolution,
      supportsOutputFormat: model.supportsOutputFormat,
      supportsOutputQuality: model.supportsOutputQuality,
      supportsNegativePrompt: model.supportsNegativePrompt,
      supportsImageInput: model.supportsImageInput,
      supportsMask: model.supportsMask,
      supportsSeed: model.supportsSeed,
      supportsStyleType: model.supportsStyleType,
      supportsStylePreset: model.supportsStylePreset,
      supportsMagicPrompt: model.supportsMagicPrompt,
      supportsStyleReferenceImages: model.supportsStyleReferenceImages,
      supportsPromptUpsampling: model.supportsPromptUpsampling,
      supportsSafetyTolerance: model.supportsSafetyTolerance,
      supportsCfg: model.supportsCfg,
      supportsPromptStrength: model.supportsPromptStrength,
      supportsLeonardoStyle: model.supportsLeonardoStyle,
      supportsContrast: model.supportsContrast,
      supportsGenerationMode: model.supportsGenerationMode,
      supportsPromptEnhance: model.supportsPromptEnhance,
      supportsNumImages: model.supportsNumImages,
    }));
    res.json(models);
  });

  // GET /api/pricing - Get pricing for all models
  app.get("/api/pricing", async (req, res) => {
    try {
      const allPricing = await storage.getAllPricingSettings();
      const pricingObject: Record<string, number> = {};
      allPricing.forEach((value, key) => {
        pricingObject[key] = value;
      });
      res.json(pricingObject);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pricing" });
    }
  });
}





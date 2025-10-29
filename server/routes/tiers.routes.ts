import type { Express } from "express";
import { storage } from "../storage";
import { db } from "../db";
import {
  authenticateToken,
  requireAdmin,
  type AuthRequest,
} from "../middleware/auth";
import { subscriptionTiers } from "@shared/schema";

/**
 * Tier Management Routes
 * Handles subscription tier CRUD operations (public listing + admin management)
 */
export function registerTierRoutes(app: Express): void {
  // ============================================================================
  // PUBLIC ROUTES
  // ============================================================================

  // GET /api/tiers - Get all active tiers (public, no auth required)
  app.get("/api/tiers", async (req, res) => {
    try {
      console.log("Fetching active subscription tiers");
      const tiers = await storage.getSubscriptionTiers();
      res.json(tiers);
    } catch (error) {
      console.error("Error fetching subscription tiers:", error);
      res.status(500).json({ error: "Failed to fetch subscription tiers" });
    }
  });

  // ============================================================================
  // ADMIN ROUTES
  // ============================================================================

  // GET /api/admin/tiers - Get all tiers including inactive (admin only)
  app.get(
    "/api/admin/tiers",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        console.log(
          "Admin fetching all subscription tiers (including inactive)",
        );
        const tiers = await db.query.subscriptionTiers.findMany({
          orderBy: [subscriptionTiers.sortOrder],
        });
        res.json(tiers);
      } catch (error) {
        console.error("Error fetching all subscription tiers:", error);
        res.status(500).json({ error: "Failed to fetch subscription tiers" });
      }
    },
  );

  // PUT /api/admin/tiers/:id - Update tier configuration (admin only)
  app.put(
    "/api/admin/tiers/:id",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const tierId = req.params.id;
        const updates = req.body;

        console.log(`Admin updating tier ${tierId}:`, updates);

        // Validate tier exists
        const existingTier = await storage.getSubscriptionTier(tierId);
        if (!existingTier) {
          return res.status(404).json({ error: "Subscription tier not found" });
        }

        // Update tier
        const updatedTier = await storage.updateSubscriptionTier(
          tierId,
          updates,
        );

        if (!updatedTier) {
          return res.status(500).json({ error: "Failed to update tier" });
        }

        console.log(`Tier ${tierId} updated successfully`);

        res.json(updatedTier);
      } catch (error) {
        console.error("Error updating subscription tier:", error);
        res.status(500).json({
          error:
            error instanceof Error
              ? error.message
              : "Failed to update subscription tier",
        });
      }
    },
  );
}





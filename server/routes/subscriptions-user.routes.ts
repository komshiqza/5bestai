import type { Express } from "express";
import { storage } from "../storage";
import {
  authenticateToken,
  type AuthRequest,
} from "../middleware/auth";

/**
 * User Subscription Management Routes
 * Handles user subscription operations (subscribe, cancel, view)
 */
export function registerUserSubscriptionRoutes(app: Express): void {
  // GET /api/subscription - Get current user's subscription with tier details
  app.get(
    "/api/subscription",
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        console.log(`Fetching subscription for user: ${userId}`);

        const subscription = await storage.getUserSubscription(userId);

        if (!subscription) {
          return res.json(null);
        }

        res.json(subscription);
      } catch (error) {
        console.error("Error fetching user subscription:", error);
        res.status(500).json({ error: "Failed to fetch subscription" });
      }
    },
  );

  // POST /api/subscription/subscribe - Subscribe to a tier
  app.post(
    "/api/subscription/subscribe",
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const { tierId, paymentMethod } = req.body;

        // Validate input
        if (!tierId || typeof tierId !== "string") {
          return res.status(400).json({ error: "tierId is required" });
        }

        if (!paymentMethod || !["stripe", "usdc"].includes(paymentMethod)) {
          return res
            .status(400)
            .json({ error: "paymentMethod must be 'stripe' or 'usdc'" });
        }

        console.log(
          `User ${userId} subscribing to tier ${tierId} with payment method: ${paymentMethod}`,
        );

        // Check if tier exists
        const tier = await storage.getSubscriptionTier(tierId);
        if (!tier) {
          return res.status(404).json({ error: "Subscription tier not found" });
        }

        if (!tier.isActive) {
          return res
            .status(400)
            .json({
              error: "This subscription tier is not currently available",
            });
        }

        // Check if user already has an active subscription
        const existingSubscription = await storage.getUserSubscription(userId);
        if (existingSubscription && existingSubscription.status === "active") {
          return res
            .status(400)
            .json({ error: "You already have an active subscription" });
        }

        // Calculate subscription period (30 days)
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setDate(periodEnd.getDate() + 30); // 30 days from now

        console.log(
          `Creating subscription: period start=${now.toISOString()}, period end=${periodEnd.toISOString()}`,
        );

        // Create subscription (without payment processing for now)
        const subscription = await storage.createUserSubscription({
          userId,
          tierId,
          status: "active",
          paymentMethod,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          creditsGranted: 0,
          cancelAtPeriodEnd: false,
        });

        console.log(`Subscription created successfully: ${subscription.id}`);

        res.status(201).json(subscription);
      } catch (error) {
        console.error("Error creating subscription:", error);
        res.status(500).json({
          error:
            error instanceof Error
              ? error.message
              : "Failed to create subscription",
        });
      }
    },
  );

  // DELETE /api/subscription/cancel - Cancel subscription at period end
  app.delete(
    "/api/subscription/cancel",
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        console.log(`User ${userId} requesting subscription cancellation`);

        const subscription = await storage.getUserSubscription(userId);

        if (!subscription) {
          return res
            .status(404)
            .json({ error: "No active subscription found" });
        }

        if (subscription.status !== "active") {
          return res.status(400).json({ error: "Subscription is not active" });
        }

        if (subscription.cancelAtPeriodEnd) {
          return res
            .status(400)
            .json({
              error: "Subscription is already scheduled for cancellation",
            });
        }

        await storage.cancelUserSubscription(subscription.id);

        console.log(
          `Subscription ${subscription.id} scheduled for cancellation at period end`,
        );

        res.json({ message: "Subscription will be cancelled at period end" });
      } catch (error) {
        console.error("Error cancelling subscription:", error);
        res.status(500).json({ error: "Failed to cancel subscription" });
      }
    },
  );

  // GET /api/subscription/transactions - Get user's payment history
  app.get(
    "/api/subscription/transactions",
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        console.log(`Fetching subscription transactions for user: ${userId}`);

        const transactions = await storage.getSubscriptionTransactions({
          userId,
        });

        res.json(transactions);
      } catch (error) {
        console.error("Error fetching subscription transactions:", error);
        res.status(500).json({ error: "Failed to fetch payment history" });
      }
    },
  );
}





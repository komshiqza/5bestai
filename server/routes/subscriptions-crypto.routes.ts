import type { Express } from "express";
import { storage } from "../storage";
import {
  authenticateToken,
  requireApproved,
  type AuthRequest,
} from "../middleware/auth";
import { PublicKey } from "@solana/web3.js";
import { findReference } from "@solana/pay";
import { solanaConnection } from "../solana";
import type { UserSubscriptionWithTier } from "@shared/schema";

/**
 * Crypto Subscription Payment Routes
 * Handles Solana/USDC payment verification and subscription activation
 */
export function registerCryptoSubscriptionRoutes(app: Express): void {
  // POST /api/subscription/purchase-crypto - Complete subscription purchase with crypto payment
  // This is a complex route that:
  // 1. Finds Solana transaction by reference
  // 2. Verifies USDC payment details (amount, recipient)
  // 3. Creates/updates subscription
  // 4. Grants monthly credits
  // 5. Records transaction in multiple ledgers
  app.post(
    "/api/subscription/purchase-crypto",
    authenticateToken,
    requireApproved,
    async (req: AuthRequest, res) => {
      try {
        console.log(
          "🔍 [SUBSCRIPTION] Starting crypto subscription purchase:",
          req.body,
        );

        const { reference, tierId, currency } = req.body;

        const userId = req.user!.id;
        console.log("👤 [SUBSCRIPTION] User ID:", userId);

        // Get user's connected wallet (optional - for additional verification)
        const userWallet = await storage.getUserWallet(userId);
        if (userWallet) {
          console.log(
            "💼 [SUBSCRIPTION] User wallet found:",
            userWallet.address,
          );
        } else {
          console.log(
            "ℹ️ [SUBSCRIPTION] No wallet connected for user (will verify via blockchain only):",
            userId,
          );
        }

        // Get platform wallet address (server-side, not client-controlled!)
        const siteSettings = await storage.getSiteSettings();
        if (!siteSettings || !siteSettings.platformWalletAddress) {
          console.error("❌ [SUBSCRIPTION] Platform wallet not configured!");
          return res
            .status(500)
            .json({
              error:
                "Platform payment address not configured. Please contact support.",
            });
        }

        const recipientAddress = siteSettings.platformWalletAddress;
        console.log("🏦 [SUBSCRIPTION] Platform wallet:", recipientAddress);

        // Get tier details
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

        // Convert cents to dollars for USDC verification
        const expectedAmount = tier.priceUsd / 100;
        console.log(
          "💰 [SUBSCRIPTION] Expected amount:",
          expectedAmount,
          currency,
          "(cents:",
          tier.priceUsd,
          ")",
        );

        // Convert reference string to PublicKey
        const referenceKey = new PublicKey(reference);
        console.log("🔑 [SUBSCRIPTION] Reference key:", reference);

        // Find transaction using reference
        console.log("🔎 [SUBSCRIPTION] Searching blockchain for reference...");
        let signatureInfo;
        try {
          signatureInfo = await findReference(solanaConnection, referenceKey);
        } catch (error: any) {
          // FindReferenceError is expected when transaction hasn't been sent yet
          if (
            error.name === "FindReferenceError" ||
            error.message?.includes("not found")
          ) {
            console.log(
              "⚠️ [SUBSCRIPTION] No transaction found for reference (polling...)",
            );
            return res.json({
              found: false,
              message:
                "Payment not found yet. Please complete the transaction in your wallet.",
            });
          }
          // Re-throw unexpected errors
          throw error;
        }

        if (!signatureInfo || !signatureInfo.signature) {
          console.log("⚠️ [SUBSCRIPTION] No transaction found for reference");
          return res.json({
            found: false,
            message:
              "Payment not found yet. Please complete the transaction in your wallet.",
          });
        }

        console.log(
          "✅ [SUBSCRIPTION] Transaction found:",
          signatureInfo.signature,
        );

        const signature = signatureInfo.signature;

        // Check if transaction already processed
        console.log(
          "🔄 [SUBSCRIPTION] Checking if transaction already processed...",
        );
        const existingTx = await storage.getGloryTransactionByHash(signature);
        if (existingTx) {
          console.log(
            "ℹ️ [SUBSCRIPTION] Transaction already processed:",
            signature,
          );
          return res.json({
            found: true,
            alreadyProcessed: true,
            success: true,
            txHash: signature,
            message: "Payment already verified",
          });
        }

        // Verify transaction details (use USDC verification for SPL token)
        console.log("🔍 [SUBSCRIPTION] Verifying USDC transaction details...");
        const { verifyUSDCTransaction } = await import("../solana.js");
        const txResult = await verifyUSDCTransaction(
          signature,
          recipientAddress,
        );
        console.log(
          "📊 [SUBSCRIPTION] USDC transaction verification result:",
          txResult,
        );

        if (!txResult.confirmed) {
          console.log("⚠️ [SUBSCRIPTION] Transaction not yet confirmed");
          return res.json({
            found: false,
            message: "Transaction found but not yet confirmed",
          });
        }

        // Log payer information (for audit trail)
        if (userWallet) {
          console.log(
            "👤 [SUBSCRIPTION] Connected wallet:",
            userWallet.address,
          );
        }
        console.log("💳 [SUBSCRIPTION] Payment from wallet:", txResult.from);

        // Verify amount (for USDC, amount is in token units, for SOL in SOL)
        console.log("💰 [SUBSCRIPTION] Verifying amount:", {
          expected: expectedAmount,
          actual: txResult.amount,
          sufficient: txResult.amount && txResult.amount >= expectedAmount,
        });
        if (!txResult.amount || txResult.amount < expectedAmount) {
          console.log("❌ [SUBSCRIPTION] Insufficient amount!");
          return res.status(400).json({
            error: `Insufficient payment amount. Expected ${expectedAmount} ${currency}, received ${txResult.amount || 0} ${currency}`,
          });
        }

        console.log("🎯 [SUBSCRIPTION] Verifying recipient:", {
          expected: recipientAddress,
          actual: txResult.to,
          match: txResult.to === recipientAddress,
        });
        if (txResult.to !== recipientAddress) {
          console.log("❌ [SUBSCRIPTION] Recipient mismatch!");
          return res.status(400).json({
            error: "Payment recipient address mismatch",
          });
        }

        console.log("✅ [SUBSCRIPTION] All verifications passed!");

        // Check if user already has subscription
        const existingSubscription = await storage.getUserSubscription(userId);

        // Calculate subscription period (30 days from now)
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setDate(periodEnd.getDate() + 30);

        let subscription: UserSubscriptionWithTier;

        if (existingSubscription && existingSubscription.id) {
          // Update existing subscription
          console.log("📝 [SUBSCRIPTION] Updating existing subscription...");
          await storage.updateUserSubscription(existingSubscription.id, {
            tierId,
            status: "active",
            paymentMethod: currency.toLowerCase(),
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            creditsGranted: tier.monthlyCredits,
            creditsGrantedAt: now,
            cancelAtPeriodEnd: false,
            cancelledAt: null,
          });

          // Fetch full subscription with tier
          const fullSub = await storage.getUserSubscription(userId);
          if (!fullSub) {
            throw new Error("Failed to fetch updated subscription");
          }
          subscription = fullSub;
        } else {
          // Create new subscription
          console.log("📝 [SUBSCRIPTION] Creating new subscription...");
          const newSub = await storage.createUserSubscription({
            userId,
            tierId,
            status: "active",
            paymentMethod: currency.toLowerCase(),
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            creditsGranted: tier.monthlyCredits,
            creditsGrantedAt: now,
            cancelAtPeriodEnd: false,
          });

          // Fetch full subscription with tier
          const fullSub = await storage.getUserSubscription(userId);
          if (!fullSub) {
            throw new Error("Failed to fetch created subscription");
          }
          subscription = fullSub;
        }

        // Grant monthly credits to user
        console.log("🎁 [SUBSCRIPTION] Granting credits to user...");
        await storage.grantMonthlyCredits(userId);

        // Create subscription transaction record
        console.log("💳 [SUBSCRIPTION] Creating transaction record...");
        await storage.createSubscriptionTransaction({
          userId,
          subscriptionId: subscription.id,
          tierId,
          amountCents: Math.round(expectedAmount * 100), // Convert to cents
          currency: currency,
          paymentMethod: currency.toLowerCase(),
          paymentStatus: "completed",
          txHash: signature,
          metadata: {
            reference,
            from: txResult.from,
            to: txResult.to,
            amount: txResult.amount,
            verifiedAt: now.toISOString(),
            creditsGranted: tier.monthlyCredits,
          },
        });

        // Record transaction in glory ledger (for audit trail)
        console.log("📝 [SUBSCRIPTION] Recording in glory ledger...");
        await storage.createGloryTransaction({
          userId,
          delta: 0, // Crypto payments don't affect GLORY balance
          currency: currency,
          reason: `Subscription purchase: ${tier.name} tier - ${expectedAmount} ${currency}`,
          txHash: signature,
          metadata: {
            reference,
            tierId,
            subscriptionId: subscription.id,
            from: txResult.from,
            to: txResult.to,
            amount: txResult.amount,
            verifiedAt: now.toISOString(),
          },
        });

        console.log(
          "✅ [SUBSCRIPTION] Subscription purchase completed successfully!",
          {
            txHash: signature,
            subscriptionId: subscription.id,
            tierName: tier.name,
            creditsGranted: tier.monthlyCredits,
          },
        );

        res.json({
          found: true,
          alreadyProcessed: false,
          success: true,
          txHash: signature,
          subscription,
          transaction: {
            signature,
            amount: txResult.amount,
            from: txResult.from,
            to: txResult.to,
          },
          message: `Successfully subscribed to ${tier.name} tier! ${tier.monthlyCredits} credits granted.`,
        });
      } catch (error) {
        console.error("💥 [SUBSCRIPTION] Subscription purchase failed:", error);

        // Handle specific errors
        if (error instanceof Error) {
          console.log("🔍 [SUBSCRIPTION] Error details:", {
            name: error.name,
            message: error.message,
            stack: error.stack?.slice(0, 200),
          });

          if (error.message.includes("not found")) {
            return res.json({
              found: false,
              message:
                "Payment not found yet. Please complete the transaction.",
            });
          }
        }

        res.status(400).json({
          error:
            error instanceof Error
              ? error.message
              : "Failed to process subscription purchase",
        });
      }
    },
  );
}





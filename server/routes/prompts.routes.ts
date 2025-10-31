import type { Express } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { eq, sql } from "drizzle-orm";
import {
  authenticateToken,
  requireApproved,
  type AuthRequest,
} from "../middleware/auth";
import { users } from "@shared/schema";
import { PublicKey } from "@solana/web3.js";
import { findReference } from "@solana/pay";

export function registerPromptRoutes(app: Express): void {
  // POST /api/prompts/purchase/:submissionId - Purchase prompt with GLORY
  app.post(
    "/api/prompts/purchase/:submissionId",
    authenticateToken,
    requireApproved,
    async (req: AuthRequest, res) => {
      try {
        const { submissionId } = req.params;
        const userId = req.user!.id;

        const purchase = await storage.purchasePrompt(userId, submissionId);

        res.json({
          success: true,
          purchase,
        });
      } catch (error) {
        console.error("Prompt purchase error:", error);
        res.status(400).json({
          error:
            error instanceof Error
              ? error.message
              : "Failed to purchase prompt",
        });
      }
    },
  );

  // GET /api/prompts/purchased - Get user's purchased prompts
  app.get(
    "/api/prompts/purchased",
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const purchases = await storage.getPurchasedPrompts(userId);

        res.json(purchases);
      } catch (error) {
        console.error("Get purchased prompts error:", error);
        res.status(500).json({ error: "Failed to fetch purchased prompts" });
      }
    },
  );

  // POST /api/prompts/purchase-with-solana - Purchase prompt with Solana/USDC
  app.post(
    "/api/prompts/purchase-with-solana",
    authenticateToken,
    requireApproved,
    async (req: AuthRequest, res) => {
      try {
        const { submissionId, txHash, reference } = req.body;
        const userId = req.user!.id;

        if (!submissionId || (!txHash && !reference)) {
          return res
            .status(400)
            .json({ error: "submissionId and txHash or reference required" });
        }

        // Get submission details
        const submission = await storage.getSubmission(submissionId);
        if (!submission || !submission.promptForSale) {
          return res
            .status(404)
            .json({ error: "Submission or prompt not found" });
        }

        if (!submission.promptPrice || !submission.promptCurrency) {
          return res.status(400).json({ error: "Prompt price not set" });
        }

        if (submission.userId === userId) {
          return res
            .status(400)
            .json({ error: "Cannot purchase your own prompt" });
        }

        // Get platform wallet address from site settings
        const siteSettings = await storage.getSiteSettings();
        if (!siteSettings || !siteSettings.platformWalletAddress) {
          return res
            .status(500)
            .json({ error: "Platform wallet not configured" });
        }

        const recipientAddress = siteSettings.platformWalletAddress;
        const expectedAmount = parseFloat(submission.promptPrice);
        const currency = submission.promptCurrency;

        // Import Solana verification
        const { Connection } = await import("@solana/web3.js");
        const solanaConnection = new Connection(
          process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
          "confirmed",
        );

        // Find transaction by reference or hash
        let signature: string;

        if (reference) {
          const referenceKey = new PublicKey(reference);
          const signatureInfo = await findReference(
            solanaConnection,
            referenceKey,
          );
          signature = signatureInfo.signature;
        } else {
          signature = txHash;
        }

        // Check if already processed
        const existingTx = await storage.getGloryTransactionByHash(signature);
        if (existingTx) {
          return res.json({
            success: true,
            alreadyProcessed: true,
            message: "Transaction already processed",
          });
        }

        // Verify transaction based on currency
        let txResult;
        if (currency === "USDC") {
          const { verifyUSDCTransaction } = await import("../solana.js");
          txResult = await verifyUSDCTransaction(signature, recipientAddress);
        } else if (currency === "SOL") {
        const { verifyTransaction } = await import("../solana.js");
        txResult = await verifyTransaction(signature);
        } else {
          return res.status(400).json({ error: "Unsupported currency" });
        }

        if (!txResult.confirmed) {
          return res.json({
            found: false,
            message: "Transaction not yet confirmed",
          });
        }

        // Verify amount
        if (!txResult.amount || txResult.amount < expectedAmount) {
          return res.status(400).json({
            error: `Insufficient payment amount. Expected ${expectedAmount} ${currency}, received ${txResult.amount || 0}`,
          });
        }

        // Verify recipient
        if (txResult.to !== recipientAddress) {
          return res
            .status(400)
            .json({ error: "Payment recipient address mismatch" });
        }

        // Record transaction (this automatically credits the user balance)
        await storage.createGloryTransaction({
          userId,
          delta: String(expectedAmount),
          currency: currency,
          reason: `Received ${expectedAmount} ${currency} from Solana payment for prompt purchase`,
          txHash: signature,
          submissionId: submissionId,
        });

        // Note: createGloryTransaction automatically updates user balance via updateUserBalance()
        // No manual balance update needed here - removed to prevent double crediting

        // Now automatically purchase the prompt with the credited balance
        const purchase = await storage.purchasePrompt(userId, submissionId);

        return res.json({
          success: true,
          purchase,
          txHash: signature,
        });
      } catch (error) {
        console.error("Prompt purchase with Solana error:", error);
        return res.status(400).json({
          error:
            error instanceof Error
              ? error.message
              : "Failed to process Solana payment",
        });
      }
    },
  );

  // GET /api/prompts/purchased/submissions - Get full submissions for purchased prompts
  app.get(
    "/api/prompts/purchased/submissions",
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const purchases = await storage.getPurchasedPrompts(userId);

        // Fetch full submission details for each purchase
        const submissionsPromises = purchases.map(async (purchase) => {
          const submission = await storage.getSubmission(purchase.submissionId);
          if (!submission) return null;

          // Get user details
          const submitter = await storage.getUser(submission.userId);

          return {
            ...submission,
            user: submitter
              ? {
                  id: submitter.id,
                  username: submitter.username,
                }
              : null,
            hasPurchasedPrompt: true,
            purchaseDate: purchase.createdAt,
            purchasePrice: purchase.price,
            purchaseCurrency: purchase.currency,
          };
        });

        const submissions = (await Promise.all(submissionsPromises)).filter(
          Boolean,
        );

        // Set Cache-Control header
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        res.json(submissions);
      } catch (error) {
        console.error("Get purchased submissions error:", error);
        res.status(500).json({ error: "Failed to fetch purchased submissions" });
      }
    },
  );
}





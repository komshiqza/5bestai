import type { Express } from "express";
import * as ed25519 from "@noble/ed25519";
import { z } from "zod";
import { storage } from "../storage";
import {
  authenticateToken,
  requireApproved,
  type AuthRequest,
} from "../middleware/auth";
import {
  upload,
  uploadFile,
} from "../services/file-upload";
import {
  updateWithdrawalAddressSchema,
  connectWalletSchema,
} from "@shared/schema";
import {
  verifyTransaction,
  solanaConnection,
} from "../solana";
import { findReference } from "@solana/pay";
import { PublicKey } from "@solana/web3.js";

// In-memory cache for /api/me endpoint
interface UserCacheEntry {
  data: any;
  timestamp: number;
}

const userCache = new Map<string, UserCacheEntry>();
const CACHE_TTL_MS = 45 * 1000; // 45 seconds TTL

// Helper function to invalidate user cache
export function invalidateUserCache(userId: string) {
  userCache.delete(`user:${userId}`);
}

export function registerUserRoutes(app: Express): void {
  // GET /api/me - Get current user profile
  app.get("/api/me", authenticateToken, async (req: AuthRequest, res) => {
    const userId = req.user!.id;
    const cacheKey = `user:${userId}`;

    // Check cache first
    const cached = userCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
      // Return cached data with ETag
      const etag = `"${cached.data.updatedAt}"`;
      res.setHeader("ETag", etag);
      
      // Check If-None-Match header
      const ifNoneMatch = req.headers["if-none-match"];
      if (ifNoneMatch === etag) {
        return res.status(304).end(); // Not Modified
      }
      
      // Return cached data
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      return res.json(cached.data);
    }

    // Auto-refresh subscription credits if period has expired
    try {
      await storage.refreshSubscriptionIfNeeded(userId);
    } catch (error) {
      console.error("Failed to refresh subscription:", error);
      // Continue even if refresh fails - don't block user request
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prepare response data
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      gloryBalance: user.gloryBalance,
      solBalance: user.solBalance,
      usdcBalance: user.usdcBalance,
      imageCredits: user.imageCredits,
      avatarUrl: user.avatarUrl,
      withdrawalAddress: user.withdrawalAddress,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt, // Added for ETag generation
    };

    // Cache the response
    userCache.set(cacheKey, {
      data: userData,
      timestamp: now,
    });

    // Set ETag header
    const etag = `"${user.updatedAt}"`;
    res.setHeader("ETag", etag);

    // Check If-None-Match header
    const ifNoneMatch = req.headers["if-none-match"];
    if (ifNoneMatch === etag) {
      return res.status(304).end(); // Not Modified
    }

    // Set Cache-Control header to prevent HTTP caching of dynamic user data
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

    res.json(userData);
  });

  // GET /api/me/submissions - Get current user's submissions
  app.get(
    "/api/me/submissions",
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const { status } = req.query;
        const filters: any = { userId: req.user!.id };

        if (status && status !== "all") {
          filters.status = status as string;
        }

        const submissions = await storage.getSubmissions(filters);
        res.json(submissions);
      } catch (error) {
        console.error("/api/me/submissions error:", error);
        res.status(500).json({ error: "Failed to fetch submissions" });
      }
    },
  );

  // PATCH /api/me - Update profile (username)
  app.patch("/api/me", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { username } = req.body;
      const userId = req.user!.id;

      if (!username || username.trim().length < 3) {
        return res
          .status(400)
          .json({ error: "Username must be at least 3 characters" });
      }

      // Check if username is already taken by another user
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: "Username already taken" });
      }

      await storage.updateUser(userId, { username: username.trim() });
      
      // Invalidate cache after user update
      invalidateUserCache(userId);
      
      const updatedUser = await storage.getUser(userId);

      res.json({
        id: updatedUser!.id,
        username: updatedUser!.username,
        email: updatedUser!.email,
        role: updatedUser!.role,
        status: updatedUser!.status,
        gloryBalance: updatedUser!.gloryBalance,
        avatarUrl: updatedUser!.avatarUrl,
        createdAt: updatedUser!.createdAt,
      });
    } catch (error) {
      res
        .status(400)
        .json({
          error:
            error instanceof Error ? error.message : "Failed to update profile",
        });
    }
  });

  // POST /api/me/avatar - Upload/update avatar
  app.post(
    "/api/me/avatar",
    authenticateToken,
    upload.single("avatar"),
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;

        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        const { url } = await uploadFile(req.file);

        await storage.updateUser(userId, { avatarUrl: url });
        
        // Invalidate cache after avatar update
        invalidateUserCache(userId);
        
        const updatedUser = await storage.getUser(userId);

        res.json({
          id: updatedUser!.id,
          username: updatedUser!.username,
          email: updatedUser!.email,
          role: updatedUser!.role,
          status: updatedUser!.status,
          gloryBalance: updatedUser!.gloryBalance,
          avatarUrl: updatedUser!.avatarUrl,
          createdAt: updatedUser!.createdAt,
        });
      } catch (error) {
        res
          .status(500)
          .json({
            error:
              error instanceof Error
                ? error.message
                : "Failed to upload avatar",
          });
      }
    },
  );

  // DELETE /api/me - Delete profile
  app.delete("/api/me", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;

      // Delete user (cascade will handle related data)
      await storage.deleteUser(userId);
      
      // Invalidate cache after user deletion
      invalidateUserCache(userId);

      // Clear auth cookie
      res.clearCookie("authToken");

      res.json({ message: "Profile deleted successfully" });
    } catch (error) {
      res
        .status(500)
        .json({
          error:
            error instanceof Error ? error.message : "Failed to delete profile",
        });
    }
  });

  // PATCH /api/users/withdrawal-address - Update withdrawal address
  app.patch(
    "/api/users/withdrawal-address",
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const { address } = updateWithdrawalAddressSchema.parse(req.body);
        const userId = req.user!.id;

        const updatedUser = await storage.updateWithdrawalAddress(
          userId,
          address,
        );

        if (!updatedUser) {
          return res.status(404).json({ error: "User not found" });
        }
        
        // Invalidate cache after withdrawal address update
        invalidateUserCache(userId);

        res.json({
          success: true,
          withdrawalAddress: updatedUser.withdrawalAddress,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res
            .status(400)
            .json({ error: "Invalid withdrawal address format" });
        }
        res
          .status(500)
          .json({
            error:
              error instanceof Error
                ? error.message
                : "Failed to update withdrawal address",
          });
      }
    },
  );

  // POST /api/wallet/connect - Connect wallet
  app.post(
    "/api/wallet/connect",
    authenticateToken,
    requireApproved,
    async (req: AuthRequest, res) => {
      try {
        const { address, provider, signature, message } =
          connectWalletSchema.parse(req.body);
        const userId = req.user!.id;

        // Check if wallet is already connected to another user
        const existingWallet = await storage.getUserWalletByAddress(address);
        if (existingWallet && existingWallet.userId !== userId) {
          return res
            .status(400)
            .json({
              error: "This wallet is already connected to another account",
            });
        }

        // Check if user already has a wallet
        const userWallet = await storage.getUserWallet(userId);
        if (userWallet) {
          return res
            .status(400)
            .json({ error: "User already has a connected wallet" });
        }

        // Verify signature
        try {
          const messageBytes = new TextEncoder().encode(message);
          const signatureBytes = Buffer.from(signature, "base64");
          const publicKeyBytes = Buffer.from(address, "base64");

          const isValid = await ed25519.verify(
            signatureBytes,
            messageBytes,
            publicKeyBytes,
          );

          if (!isValid) {
            return res.status(400).json({ error: "Invalid signature" });
          }
        } catch (error) {
          return res
            .status(400)
            .json({ error: "Signature verification failed" });
        }

        // Create wallet
        const wallet = await storage.createUserWallet({
          userId,
          address,
          provider,
          status: "active",
          verifiedAt: new Date(),
        });

        res.json({ wallet });
      } catch (error) {
        res
          .status(400)
          .json({
            error:
              error instanceof Error
                ? error.message
                : "Failed to connect wallet",
          });
      }
    },
  );

  // GET /api/wallet/me - Get user's wallet
  app.get(
    "/api/wallet/me",
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const wallet = await storage.getUserWallet(req.user!.id);
        res.json({ wallet });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch wallet" });
      }
    },
  );

  // Solana payment verification schema
  const verifySolanaPaymentSchema = z.object({
    signature: z.string(),
    expectedAmount: z.number().positive(),
    recipientAddress: z.string(),
    contestId: z.string().uuid().optional(),
    submissionId: z.string().uuid().optional(),
  });

  // POST /api/payment/verify-solana - Verify Solana payment
  app.post(
    "/api/payment/verify-solana",
    authenticateToken,
    requireApproved,
    async (req: AuthRequest, res) => {
      try {
        const {
          signature,
          expectedAmount,
          recipientAddress,
          contestId,
          submissionId,
        } = verifySolanaPaymentSchema.parse(req.body);

        const userId = req.user!.id;

        // Get user's connected wallet
        const userWallet = await storage.getUserWallet(userId);
        if (!userWallet) {
          return res
            .status(400)
            .json({
              error:
                "No wallet connected. Please connect your Solana wallet first.",
            });
        }

        // Check if transaction already used (prevent replay attacks)
        const existingTx = await storage.getGloryTransactionByHash(signature);
        if (existingTx) {
          return res
            .status(400)
            .json({
              error:
                "Transaction already verified. Each transaction can only be used once.",
            });
        }

        // Verify transaction on Solana blockchain
        const txResult = await verifyTransaction(signature);

        if (!txResult.confirmed) {
          return res
            .status(400)
            .json({
              error:
                "Transaction not found or not confirmed on Solana blockchain",
            });
        }

        // Verify payer matches user's connected wallet
        if (txResult.from !== userWallet.address) {
          return res.status(400).json({
            error: `Transaction payer mismatch. Expected ${userWallet.address}, got ${txResult.from}`,
          });
        }

        // Verify transaction details
        if (!txResult.amount || txResult.amount < expectedAmount) {
          return res.status(400).json({
            error: `Insufficient payment amount. Expected ${expectedAmount} SOL, received ${txResult.amount || 0} SOL`,
          });
        }

        if (txResult.to !== recipientAddress) {
          return res.status(400).json({
            error: "Payment recipient address mismatch",
          });
        }

        // Record transaction in glory ledger
        await storage.createGloryTransaction({
          userId,
          delta: "0", // Crypto payments don't affect GLORY balance
          currency: "SOL",
          reason: `Solana payment verified - ${expectedAmount} SOL`,
          contestId: contestId || null,
          submissionId: submissionId || null,
          txHash: signature,
          metadata: {
            from: txResult.from,
            to: txResult.to,
            amount: txResult.amount,
            verifiedAt: new Date().toISOString(),
          },
        });

        res.json({
          success: true,
          transaction: {
            signature,
            amount: txResult.amount,
            from: txResult.from,
            to: txResult.to,
          },
        });
      } catch (error) {
        console.error("Solana payment verification error:", error);
        res.status(400).json({
          error:
            error instanceof Error
              ? error.message
              : "Failed to verify Solana payment",
        });
      }
    },
  );

  // Find payment by reference schema
  const findPaymentByReferenceSchema = z.object({
    reference: z.string(), // Base58 public key
    expectedAmount: z.number().positive(),
    recipientAddress: z.string(),
    contestId: z.string().uuid().optional(),
    submissionId: z.string().uuid().optional(),
  });

  // POST /api/payment/find-by-reference - Find payment by reference
  app.post(
    "/api/payment/find-by-reference",
    authenticateToken,
    requireApproved,
    async (req: AuthRequest, res) => {
      try {
        console.log("🔍 [PAYMENT] Starting payment verification:", req.body);

        const {
          reference,
          expectedAmount,
          recipientAddress,
          contestId,
          submissionId,
        } = findPaymentByReferenceSchema.parse(req.body);

        const userId = req.user!.id;
        console.log("👤 [PAYMENT] User ID:", userId);

        // Get user's connected wallet
        const userWallet = await storage.getUserWallet(userId);
        if (!userWallet) {
          console.log("❌ [PAYMENT] No wallet connected for user:", userId);
          return res
            .status(400)
            .json({
              error:
                "No wallet connected. Please connect your Solana wallet first.",
            });
        }

        console.log("💼 [PAYMENT] User wallet found:", userWallet.address);

        // Convert reference string to PublicKey
        const referenceKey = new PublicKey(reference);
        console.log("🔑 [PAYMENT] Reference key:", reference);

        // Find transaction using reference
        console.log("🔎 [PAYMENT] Searching blockchain for reference...");
        const signatureInfo = await findReference(
          solanaConnection,
          referenceKey,
        );

        if (!signatureInfo || !signatureInfo.signature) {
          console.log("⚠️ [PAYMENT] No transaction found for reference");
          return res.json({
            found: false,
            message:
              "Payment not found yet. Please complete the transaction in your wallet.",
          });
        }

        console.log("✅ [PAYMENT] Transaction found:", signatureInfo.signature);

        const signature = signatureInfo.signature;

        // Check if transaction already processed
        console.log(
          "🔄 [PAYMENT] Checking if transaction already processed...",
        );
        const existingTx = await storage.getGloryTransactionByHash(signature);
        if (existingTx) {
          console.log("ℹ️ [PAYMENT] Transaction already processed:", signature);
          return res.json({
            found: true,
            alreadyProcessed: true,
            success: true,
            txHash: signature,
            message: "Payment already verified",
          });
        }

        // Verify transaction details
        console.log("🔍 [PAYMENT] Verifying transaction details...");
        const txResult = await verifyTransaction(signature);
        console.log("📊 [PAYMENT] Transaction verification result:", txResult);

        if (!txResult.confirmed) {
          console.log("⚠️ [PAYMENT] Transaction not yet confirmed");
          return res.json({
            found: false,
            message: "Transaction found but not yet confirmed",
          });
        }

        // Verify payer matches user's connected wallet
        console.log("👤 [PAYMENT] Verifying payer:", {
          expected: userWallet.address,
          actual: txResult.from,
          match: txResult.from === userWallet.address,
        });
        if (txResult.from !== userWallet.address) {
          console.log("❌ [PAYMENT] Payer mismatch!");
          return res.status(400).json({
            error: `Transaction payer mismatch. Expected ${userWallet.address}, got ${txResult.from}`,
          });
        }

        // Verify transaction details
        console.log("💰 [PAYMENT] Verifying amount:", {
          expected: expectedAmount,
          actual: txResult.amount,
          sufficient: txResult.amount && txResult.amount >= expectedAmount,
        });
        if (!txResult.amount || txResult.amount < expectedAmount) {
          console.log("❌ [PAYMENT] Insufficient amount!");
          return res.status(400).json({
            error: `Insufficient payment amount. Expected ${expectedAmount} SOL, received ${txResult.amount || 0} SOL`,
          });
        }

        console.log("🎯 [PAYMENT] Verifying recipient:", {
          expected: recipientAddress,
          actual: txResult.to,
          match: txResult.to === recipientAddress,
        });
        if (txResult.to !== recipientAddress) {
          console.log("❌ [PAYMENT] Recipient mismatch!");
          return res.status(400).json({
            error: "Payment recipient address mismatch",
          });
        }

        console.log("✅ [PAYMENT] All verifications passed!");

        // Record transaction in glory ledger
        console.log("📝 [PAYMENT] Recording transaction in ledger...");
        const ledgerEntry = await storage.createGloryTransaction({
          userId,
          delta: "0", // Crypto payments don't affect GLORY balance
          currency: "SOL",
          reason: `Solana payment verified via reference - ${expectedAmount} SOL`,
          contestId: contestId || null,
          submissionId: submissionId || null,
          txHash: signature,
          metadata: {
            reference,
            from: txResult.from,
            to: txResult.to,
            amount: txResult.amount,
            verifiedAt: new Date().toISOString(),
          },
        });

        console.log(
          "✅ [PAYMENT] Payment verification completed successfully!",
          {
            txHash: signature,
            amount: txResult.amount,
            ledgerEntryId: ledgerEntry.id,
          },
        );

        res.json({
          found: true,
          alreadyProcessed: false,
          success: true,
          txHash: signature,
          transaction: {
            signature,
            amount: txResult.amount,
            from: txResult.from,
            to: txResult.to,
          },
        });
      } catch (error) {
        console.error("💥 [PAYMENT] Payment verification failed:", error);

        // Handle specific errors
        if (error instanceof Error) {
          console.log("🔍 [PAYMENT] Error details:", {
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
            error instanceof Error ? error.message : "Failed to find payment",
        });
      }
    },
  );

  // GET /api/glory-ledger - User transaction history
  app.get(
    "/api/glory-ledger",
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const { currency } = req.query;
        const transactions = await storage.getGloryTransactions(
          req.user!.id,
          currency as string | undefined,
        );
        res.json(transactions);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch transactions" });
      }
    },
  );

  // DELETE /api/glory-ledger - Clear user transaction history
  app.delete(
    "/api/glory-ledger",
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        // Clear all glory transactions for the user without affecting balance
        await storage.clearGloryTransactions(req.user!.id);

        res.json({ message: "All GLORY history cleared successfully" });
      } catch (error) {
        console.error("Error clearing glory history:", error);
        res.status(500).json({ error: "Failed to clear GLORY history" });
      }
    },
  );

  // GET /api/proxy-download - Proxy external image downloads
  app.get(
    "/api/proxy-download",
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const { url } = req.query;

        if (!url || typeof url !== "string") {
          return res.status(400).json({ error: "URL parameter is required" });
        }

        // SSRF Protection: Whitelist allowed domains
        const ALLOWED_DOMAINS = [
          "replicate.com",
          "replicate.delivery",
          "supabase.co",
          "cloudinary.com",
        ];
        let urlObj: URL;
        try {
          urlObj = new URL(url);
        } catch {
          return res.status(400).json({ error: "Invalid URL format" });
        }

        const isAllowed = ALLOWED_DOMAINS.some((domain) =>
          urlObj.hostname.endsWith(domain),
        );
        if (!isAllowed) {
          console.error(
            `[SSRF Protection] Blocked request to: ${urlObj.hostname}`,
          );
          return res.status(400).json({ error: "URL domain not allowed" });
        }

        console.log("Proxy download request for URL:", url);

        // Fetch the image from external URL
        const response = await fetch(url);

        if (!response.ok) {
          console.error(
            `Failed to fetch from ${url}: ${response.status} ${response.statusText}`,
          );
          return res.status(response.status).json({
            error: `Failed to fetch image: ${response.statusText}`,
          });
        }

        // Get content type and set appropriate headers
        const contentType =
          response.headers.get("content-type") || "application/octet-stream";
        const contentLength = response.headers.get("content-length");

        console.log(
          `Fetched image: ${contentType}, size: ${contentLength || "unknown"}`,
        );

        // Prevent browser caching to avoid 304 Not Modified responses
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");

        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Disposition", "attachment");
        if (contentLength) {
          res.setHeader("Content-Length", contentLength);
        }

        // Stream the image data to the response
        const buffer = await response.arrayBuffer();
        console.log(`Sending buffer of size: ${buffer.byteLength} bytes`);
        res.send(Buffer.from(buffer));
      } catch (error) {
        console.error("Proxy download error:", error);
        res.status(500).json({
          error:
            error instanceof Error ? error.message : "Failed to download image",
        });
      }
    },
  );
}


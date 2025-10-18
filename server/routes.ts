import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import * as ed25519 from "@noble/ed25519";
import { storage } from "./storage";
import { db } from "./db";
import { authenticateToken, requireAdmin, requireApproved, generateToken, type AuthRequest } from "./middleware/auth";
import { votingRateLimiter } from "./services/rate-limiter";
import { upload, uploadFile, deleteFile } from "./services/file-upload";
import { calculateRewardDistribution } from "./services/reward-distribution";
import { ContestScheduler } from "./contest-scheduler";
import { verifyTransaction, solanaConnection, solanaConnectionProcessed } from "./solana";
import { findReference } from "@solana/pay";
import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
import { 
  loginSchema, 
  registerSchema, 
  voteSubmissionSchema,
  updateUserStatusSchema,
  updateSubmissionStatusSchema,
  updateWithdrawalAddressSchema,
  bulkSubmissionIdsSchema,
  insertContestSchema,
  insertSubmissionSchema,
  connectWalletSchema,
  createCashoutRequestSchema,
  updateCashoutStatusSchema,
  approveCashoutSchema,
  rejectCashoutSchema,
  bulkCashoutIdsSchema,
  bulkRejectCashoutSchema,
  insertSiteSettingsSchema,
  subscriptionTiers,
  type SubscriptionTier,
  type UserSubscriptionWithTier,
  type UserSubscription,
  type SubscriptionTransaction
} from "@shared/schema";

// Create contest scheduler instance
export const contestScheduler = new ContestScheduler(storage);

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(cookieParser());
  
  // Initialize contest scheduler
  contestScheduler.initialize().catch(err => {
    console.error("Failed to initialize contest scheduler:", err);
  });
  
  // Track recent GLORY balance requests to prevent duplicates
  const recentGloryRequests = new Map<string, number>();


  
  // Serve uploaded files from public/uploads directory
  const express = await import("express");
  const path = await import("path");
  app.use("/uploads", express.default.static(path.join(process.cwd(), "public", "uploads")));

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password } = registerSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "User with this email already exists" });
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: "Username already taken" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser({
        username,
        email,
        passwordHash,
        role: "user",
        status: "pending" // Requires admin approval
      });

      // Auto-assign Free tier subscription to new users
      try {
        const freeTier = await storage.getSubscriptionTierBySlug("free");
        if (freeTier) {
          // Free tier: set period end far in the future (100 years)
          const farFuture = new Date();
          farFuture.setFullYear(farFuture.getFullYear() + 100);
          
          await storage.createUserSubscription({
            userId: user.id,
            tierId: freeTier.id,
            status: "active",
            currentPeriodStart: new Date(),
            currentPeriodEnd: farFuture,
            cancelAtPeriodEnd: false
          });
          console.log(`Assigned Free tier to new user: ${user.id}`);
        } else {
          console.warn("Free tier not found, user created without subscription");
        }
      } catch (error) {
        console.error("Failed to assign Free tier to new user:", error);
        // Continue anyway - user creation succeeded
      }

      res.status(201).json({ 
        message: "User created successfully. Please wait for admin approval.",
        user: { id: user.id, username: user.username, email: user.email, status: user.status }
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid input" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (user.status === "banned") {
        return res.status(403).json({ error: "Account is banned" });
      }

      // Generate JWT token
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status
      });

      // Set httpOnly cookie
      res.cookie("authToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({ 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email, 
          role: user.role, 
          status: user.status,
          gloryBalance: user.gloryBalance
        }
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid input" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("authToken");
    res.json({ message: "Logged out successfully" });
  });

  app.get("/api/me", authenticateToken, async (req: AuthRequest, res) => {
    const userId = req.user!.id;

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

    res.json({
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
      createdAt: user.createdAt
    });
  });

  app.get("/api/me/submissions", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { status } = req.query;
      const filters: any = { userId: req.user!.id };
      
      if (status && status !== 'all') {
        filters.status = status as string;
      }
      
      const submissions = await storage.getSubmissions(filters);
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  // Update profile (username)
  app.patch("/api/me", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { username } = req.body;
      const userId = req.user!.id;

      if (!username || username.trim().length < 3) {
        return res.status(400).json({ error: "Username must be at least 3 characters" });
      }

      // Check if username is already taken by another user
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: "Username already taken" });
      }

      await storage.updateUser(userId, { username: username.trim() });
      const updatedUser = await storage.getUser(userId);

      res.json({
        id: updatedUser!.id,
        username: updatedUser!.username,
        email: updatedUser!.email,
        role: updatedUser!.role,
        status: updatedUser!.status,
        gloryBalance: updatedUser!.gloryBalance,
        avatarUrl: updatedUser!.avatarUrl,
        createdAt: updatedUser!.createdAt
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update profile" });
    }
  });

  // Upload/update avatar
  app.post("/api/me/avatar", authenticateToken, upload.single("avatar"), async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { url } = await uploadFile(req.file);

      await storage.updateUser(userId, { avatarUrl: url });
      const updatedUser = await storage.getUser(userId);

      res.json({
        id: updatedUser!.id,
        username: updatedUser!.username,
        email: updatedUser!.email,
        role: updatedUser!.role,
        status: updatedUser!.status,
        gloryBalance: updatedUser!.gloryBalance,
        avatarUrl: updatedUser!.avatarUrl,
        createdAt: updatedUser!.createdAt
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to upload avatar" });
    }
  });

  // Delete profile
  app.delete("/api/me", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      
      // Delete user (cascade will handle related data)
      await storage.deleteUser(userId);

      // Clear auth cookie
      res.clearCookie("authToken");
      
      res.json({ message: "Profile deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to delete profile" });
    }
  });

  // Update withdrawal address
  app.patch("/api/users/withdrawal-address", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { address } = updateWithdrawalAddressSchema.parse(req.body);
      const userId = req.user!.id;

      const updatedUser = await storage.updateWithdrawalAddress(userId, address);
      
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ 
        success: true, 
        withdrawalAddress: updatedUser.withdrawalAddress 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid withdrawal address format" });
      }
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to update withdrawal address" });
    }
  });

  // Wallet routes
  app.post("/api/wallet/connect", authenticateToken, requireApproved, async (req: AuthRequest, res) => {
    try {
      const { address, provider, signature, message } = connectWalletSchema.parse(req.body);
      const userId = req.user!.id;

      // Check if wallet is already connected to another user
      const existingWallet = await storage.getUserWalletByAddress(address);
      if (existingWallet && existingWallet.userId !== userId) {
        return res.status(400).json({ error: "This wallet is already connected to another account" });
      }

      // Check if user already has a wallet
      const userWallet = await storage.getUserWallet(userId);
      if (userWallet) {
        return res.status(400).json({ error: "User already has a connected wallet" });
      }

      // Verify signature
      try {
        const messageBytes = new TextEncoder().encode(message);
        const signatureBytes = Buffer.from(signature, 'base64');
        const publicKeyBytes = Buffer.from(address, 'base64');
        
        const isValid = await ed25519.verify(signatureBytes, messageBytes, publicKeyBytes);
        
        if (!isValid) {
          return res.status(400).json({ error: "Invalid signature" });
        }
      } catch (error) {
        return res.status(400).json({ error: "Signature verification failed" });
      }

      // Create wallet
      const wallet = await storage.createUserWallet({
        userId,
        address,
        provider,
        status: "active",
        verifiedAt: new Date()
      });

      res.json({ wallet });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to connect wallet" });
    }
  });

  app.get("/api/wallet/me", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const wallet = await storage.getUserWallet(req.user!.id);
      res.json({ wallet });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch wallet" });
    }
  });

  // Solana payment verification
  const verifySolanaPaymentSchema = z.object({
    signature: z.string(),
    expectedAmount: z.number().positive(),
    recipientAddress: z.string(),
    contestId: z.string().uuid().optional(),
    submissionId: z.string().uuid().optional(),
  });

  app.post("/api/payment/verify-solana", authenticateToken, requireApproved, async (req: AuthRequest, res) => {
    try {
      const { signature, expectedAmount, recipientAddress, contestId, submissionId } = 
        verifySolanaPaymentSchema.parse(req.body);
      
      const userId = req.user!.id;

      // Get user's connected wallet
      const userWallet = await storage.getUserWallet(userId);
      if (!userWallet) {
        return res.status(400).json({ error: "No wallet connected. Please connect your Solana wallet first." });
      }

      // Check if transaction already used (prevent replay attacks)
      const existingTx = await storage.getGloryTransactionByHash(signature);
      if (existingTx) {
        return res.status(400).json({ error: "Transaction already verified. Each transaction can only be used once." });
      }

      // Verify transaction on Solana blockchain
      const txResult = await verifyTransaction(signature);

      if (!txResult.confirmed) {
        return res.status(400).json({ error: "Transaction not found or not confirmed on Solana blockchain" });
      }

      // Verify payer matches user's connected wallet
      if (txResult.from !== userWallet.address) {
        return res.status(400).json({ 
          error: `Transaction payer mismatch. Expected ${userWallet.address}, got ${txResult.from}` 
        });
      }

      // Verify transaction details
      if (!txResult.amount || txResult.amount < expectedAmount) {
        return res.status(400).json({ 
          error: `Insufficient payment amount. Expected ${expectedAmount} SOL, received ${txResult.amount || 0} SOL` 
        });
      }

      if (txResult.to !== recipientAddress) {
        return res.status(400).json({ 
          error: "Payment recipient address mismatch" 
        });
      }

      // Record transaction in glory ledger
      await storage.createGloryTransaction({
        userId,
        delta: 0, // Crypto payments don't affect GLORY balance
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
        }
      });

      res.json({ 
        success: true, 
        transaction: {
          signature,
          amount: txResult.amount,
          from: txResult.from,
          to: txResult.to,
        }
      });
    } catch (error) {
      console.error("Solana payment verification error:", error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Failed to verify Solana payment" 
      });
    }
  });

  // Find payment by reference (Solana Pay reference tracking)
  const findPaymentByReferenceSchema = z.object({
    reference: z.string(), // Base58 public key
    expectedAmount: z.number().positive(),
    recipientAddress: z.string(),
    contestId: z.string().uuid().optional(),
    submissionId: z.string().uuid().optional(),
  });

  app.post("/api/payment/find-by-reference", authenticateToken, requireApproved, async (req: AuthRequest, res) => {
    try {
      console.log("🔍 [PAYMENT] Starting payment verification:", req.body);
      
      const { reference, expectedAmount, recipientAddress, contestId, submissionId } = 
        findPaymentByReferenceSchema.parse(req.body);
      
      const userId = req.user!.id;
      console.log("👤 [PAYMENT] User ID:", userId);

      // Get user's connected wallet
      const userWallet = await storage.getUserWallet(userId);
      if (!userWallet) {
        console.log("❌ [PAYMENT] No wallet connected for user:", userId);
        return res.status(400).json({ error: "No wallet connected. Please connect your Solana wallet first." });
      }
      
      console.log("💼 [PAYMENT] User wallet found:", userWallet.address);

      // Convert reference string to PublicKey
      const referenceKey = new PublicKey(reference);
      console.log("🔑 [PAYMENT] Reference key:", reference);

      // Find transaction using reference  
      console.log("🔎 [PAYMENT] Searching blockchain for reference...");
      const signatureInfo = await findReference(solanaConnection, referenceKey);
      
      if (!signatureInfo || !signatureInfo.signature) {
        console.log("⚠️ [PAYMENT] No transaction found for reference");
        return res.json({ found: false, message: "Payment not found yet. Please complete the transaction in your wallet." });
      }

      console.log("✅ [PAYMENT] Transaction found:", signatureInfo.signature);

      const signature = signatureInfo.signature;

      // Check if transaction already processed
      console.log("🔄 [PAYMENT] Checking if transaction already processed...");
      const existingTx = await storage.getGloryTransactionByHash(signature);
      if (existingTx) {
        console.log("ℹ️ [PAYMENT] Transaction already processed:", signature);
        return res.json({ 
          found: true, 
          alreadyProcessed: true,
          success: true,
          txHash: signature,
          message: "Payment already verified" 
        });
      }

      // Verify transaction details
      console.log("🔍 [PAYMENT] Verifying transaction details...");
      const txResult = await verifyTransaction(signature);
      console.log("📊 [PAYMENT] Transaction verification result:", txResult);

      if (!txResult.confirmed) {
        console.log("⚠️ [PAYMENT] Transaction not yet confirmed");
        return res.json({ found: false, message: "Transaction found but not yet confirmed" });
      }

      // Verify payer matches user's connected wallet
      console.log("👤 [PAYMENT] Verifying payer:", {
        expected: userWallet.address,
        actual: txResult.from,
        match: txResult.from === userWallet.address
      });
      if (txResult.from !== userWallet.address) {
        console.log("❌ [PAYMENT] Payer mismatch!");
        return res.status(400).json({ 
          error: `Transaction payer mismatch. Expected ${userWallet.address}, got ${txResult.from}` 
        });
      }

      // Verify transaction details
      console.log("💰 [PAYMENT] Verifying amount:", {
        expected: expectedAmount,
        actual: txResult.amount,
        sufficient: txResult.amount && txResult.amount >= expectedAmount
      });
      if (!txResult.amount || txResult.amount < expectedAmount) {
        console.log("❌ [PAYMENT] Insufficient amount!");
        return res.status(400).json({ 
          error: `Insufficient payment amount. Expected ${expectedAmount} SOL, received ${txResult.amount || 0} SOL` 
        });
      }

      console.log("🎯 [PAYMENT] Verifying recipient:", {
        expected: recipientAddress,
        actual: txResult.to,
        match: txResult.to === recipientAddress
      });
      if (txResult.to !== recipientAddress) {
        console.log("❌ [PAYMENT] Recipient mismatch!");
        return res.status(400).json({ 
          error: "Payment recipient address mismatch" 
        });
      }

      console.log("✅ [PAYMENT] All verifications passed!");

      // Record transaction in glory ledger
      console.log("📝 [PAYMENT] Recording transaction in ledger...");
      const ledgerEntry = await storage.createGloryTransaction({
        userId,
        delta: 0, // Crypto payments don't affect GLORY balance
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
        }
      });

      console.log("✅ [PAYMENT] Payment verification completed successfully!", {
        txHash: signature,
        amount: txResult.amount,
        ledgerEntryId: ledgerEntry.id
      });

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
        }
      });
    } catch (error) {
      console.error("💥 [PAYMENT] Payment verification failed:", error);
      
      // Handle specific errors
      if (error instanceof Error) {
        console.log("🔍 [PAYMENT] Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack?.slice(0, 200)
        });
        
        if (error.message.includes("not found")) {
          return res.json({ found: false, message: "Payment not found yet. Please complete the transaction." });
        }
      }
      
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Failed to find payment" 
      });
    }
  });

  // Cashout routes
  app.post("/api/cashout/request", authenticateToken, requireApproved, async (req: AuthRequest, res) => {
    try {
      const { withdrawalAddress, amountGlory, tokenType } = createCashoutRequestSchema.parse(req.body);
      const userId = req.user!.id;

      // Check user balance
      const user = await storage.getUser(userId);
      if (!user || user.gloryBalance < amountGlory) {
        return res.status(400).json({ error: "Insufficient GLORY balance" });
      }

      // Calculate token amount (for MVP, use 1:1 ratio or configure exchange rate)
      const exchangeRate = 1; // 1 GLORY = 1 USDC (adjust as needed)
      const amountToken = (amountGlory * exchangeRate).toString();

      // Create cashout request
      const request = await storage.createCashoutRequest({
        userId,
        withdrawalAddress,
        amountGlory,
        amountToken,
        tokenType: tokenType || "USDC",
        status: "pending"
      });

      // Create event log
      await storage.createCashoutEvent({
        cashoutRequestId: request.id,
        fromStatus: "created",
        toStatus: "pending",
        actorUserId: userId,
        notes: "Cashout request created"
      });

      res.json({ request });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create cashout request" });
    }
  });

  app.get("/api/cashout/requests", authenticateToken, requireApproved, async (req: AuthRequest, res) => {
    try {
      const requests = await storage.getCashoutRequests({ userId: req.user!.id });
      res.json({ requests });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cashout requests" });
    }
  });

  app.get("/api/cashout/requests/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const request = await storage.getCashoutRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Cashout request not found" });
      }

      // Check if user owns the request or is admin
      if (request.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const events = await storage.getCashoutEvents(request.id);
      res.json({ request, events });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cashout request" });
    }
  });

  // Contest routes
  app.get("/api/contests", async (req, res) => {
    try {
      const { status } = req.query;
      const contests = await storage.getContests(status ? { status: status as string } : undefined);
      
      // Auto-end contests that have passed their endAt time
      const now = new Date();
      const updatedContests = await Promise.all(
        contests.map(async (contest) => {
          if (contest.status === "active" && new Date(contest.endAt) < now) {
            const updated = await storage.updateContest(contest.id, { status: "ended" });
            return updated || contest;
          }
          return contest;
        })
      );
      
      // Filter out contests that were auto-ended if user requested a specific status
      const filteredContests = status 
        ? updatedContests.filter(contest => contest.status === status)
        : updatedContests;
      
      // Flatten prizeDistribution from config for frontend
      const contestsWithPrizes = filteredContests.map(contest => ({
        ...contest,
        prizeDistribution: (contest.config as any)?.prizeDistribution || []
      }));
      
      res.json(contestsWithPrizes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contests" });
    }
  });

  app.get("/api/contests/:id", async (req, res) => {
    try {
      let contest = await storage.getContest(req.params.id);
      if (!contest) {
        return res.status(404).json({ error: "Contest not found" });
      }

      // Auto-end contest if it has passed its endAt time
      const now = new Date();
      if (contest.status === "active" && new Date(contest.endAt) < now) {
        const updated = await storage.updateContest(contest.id, { status: "ended" });
        contest = updated || contest;
      }

      // Get top 10 submissions for this contest
      const topSubmissions = await storage.getTopSubmissionsByContest(contest.id, 10);
      
      res.json({
        ...contest,
        prizeDistribution: (contest.config as any)?.prizeDistribution || [],
        topSubmissions
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contest" });
    }
  });

  app.post("/api/admin/contests", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const contestData = insertContestSchema.parse(req.body);
      const contest = await storage.createContest(contestData);

      // Log admin action
      await storage.createAuditLog({
        actorUserId: req.user!.id,
        action: "CREATE_CONTEST",
        meta: { contestId: contest.id, title: contest.title }
      });

      res.status(201).json(contest);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid input" });
    }
  });

  app.patch("/api/admin/contests/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      let updateData = { ...req.body };
      
      // Convert date strings to Date objects for Drizzle
      if (updateData.startAt) {
        updateData.startAt = new Date(updateData.startAt);
      }
      if (updateData.endAt) {
        updateData.endAt = new Date(updateData.endAt);
      }
      
      // If no cover image is provided or it's explicitly set to null/empty, use top voted submission
      if (!updateData.coverImageUrl || updateData.coverImageUrl === '') {
        const topSubmissions = await storage.getTopSubmissionsByContest(req.params.id, 1);
        if (topSubmissions.length > 0 && topSubmissions[0].type === 'image') {
          updateData.coverImageUrl = topSubmissions[0].mediaUrl;
        }
      }
      
      const updatedContest = await storage.updateContest(req.params.id, updateData);
      if (!updatedContest) {
        return res.status(404).json({ error: "Contest not found" });
      }

      // Reschedule automatic end if endAt was updated and contest is active
      if (updateData.endAt && updatedContest.status === "active") {
        contestScheduler.rescheduleContest(updatedContest.id, updatedContest.endAt);
      }

      // Log admin action
      await storage.createAuditLog({
        actorUserId: req.user!.id,
        action: "UPDATE_CONTEST",
        meta: { contestId: updatedContest.id, updates: req.body }
      });

      res.json(updatedContest);
    } catch (error) {
      console.error("Error updating contest:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid input" });
    }
  });

  app.patch("/api/admin/contests/:id/activate", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const contest = await storage.getContest(req.params.id);
      if (!contest) {
        return res.status(404).json({ error: "Contest not found" });
      }

      if (contest.status !== "draft") {
        return res.status(400).json({ error: "Only draft contests can be activated" });
      }

      // Update contest status to active
      const updatedContest = await storage.updateContest(contest.id, { status: "active" });

      // Schedule automatic end for this contest
      if (updatedContest && updatedContest.endAt) {
        contestScheduler.scheduleContestEnd(updatedContest.id, updatedContest.endAt);
      }

      // Log admin action
      await storage.createAuditLog({
        actorUserId: req.user!.id,
        action: "ACTIVATE_CONTEST",
        meta: { contestId: contest.id, title: contest.title }
      });

      res.json({ message: "Contest activated successfully", contest: updatedContest });
    } catch (error) {
      console.error("Error activating contest:", error);
      res.status(500).json({ 
        error: "Failed to activate contest",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/admin/contests/:id/end", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const contest = await storage.getContest(req.params.id);
      if (!contest) {
        return res.status(404).json({ error: "Contest not found" });
      }

      if (contest.status !== "active") {
        return res.status(400).json({ error: "Contest is not active" });
      }

      // Cancel any scheduled automatic distribution
      contestScheduler.cancelJob(contest.id);

      // Distribute rewards using transaction-like approach
      await storage.distributeContestRewards(contest.id);

      // Log admin action
      await storage.createAuditLog({
        actorUserId: req.user!.id,
        action: "END_CONTEST",
        meta: { contestId: contest.id, prizePool: contest.prizeGlory }
      });

      res.json({ message: "Contest ended and rewards distributed successfully" });
    } catch (error) {
      console.error("Error ending contest:", error);
      res.status(500).json({ 
        error: "Failed to end contest and distribute rewards",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.delete("/api/admin/contests/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const contest = await storage.getContest(req.params.id);
      if (!contest) {
        return res.status(404).json({ error: "Contest not found" });
      }

      await storage.deleteContest(req.params.id);

      // Log admin action
      await storage.createAuditLog({
        actorUserId: req.user!.id,
        action: "DELETE_CONTEST",
        meta: { contestId: contest.id, title: contest.title }
      });

      res.json({ message: "Contest deleted successfully" });
    } catch (error) {
      console.error("Error deleting contest:", error);
      res.status(500).json({ 
        error: "Failed to delete contest",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Bulk activate contests
  app.patch("/api/admin/contests/bulk/activate", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { contestIds } = z.object({ contestIds: z.array(z.string()).min(1) }).parse(req.body);
      
      let updatedCount = 0;
      const updatedContests = [];
      
      for (const contestId of contestIds) {
        const contest = await storage.getContest(contestId);
        if (contest && contest.status === "draft") {
          const updated = await storage.updateContest(contestId, { status: "active" });
          if (updated) {
            updatedCount++;
            updatedContests.push({ id: updated.id, title: updated.title });
            // Schedule automatic end for each activated contest
            if (updated.endAt) {
              contestScheduler.scheduleContestEnd(updated.id, updated.endAt);
            }
          }
        }
      }

      // Log admin action
      await storage.createAuditLog({
        actorUserId: req.user!.id,
        action: "BULK_ACTIVATE_CONTESTS",
        meta: { contestIds, updatedContests, updatedCount }
      });

      res.json({ success: true, updatedCount, message: `Successfully activated ${updatedCount} contests` });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid input" });
    }
  });

  // Bulk end and distribute contests
  app.post("/api/admin/contests/bulk/end", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { contestIds } = z.object({ contestIds: z.array(z.string()).min(1) }).parse(req.body);
      
      let endedCount = 0;
      const endedContests = [];
      const errors = [];
      
      for (const contestId of contestIds) {
        try {
          const contest = await storage.getContest(contestId);
          if (contest && contest.status === "active") {
            // Cancel any scheduled automatic distribution
            contestScheduler.cancelJob(contestId);
            
            await storage.distributeContestRewards(contestId);
            endedCount++;
            endedContests.push({ id: contest.id, title: contest.title, prizeGlory: contest.prizeGlory });
          }
        } catch (error) {
          errors.push({ contestId, error: error instanceof Error ? error.message : "Unknown error" });
        }
      }

      // Log admin action
      await storage.createAuditLog({
        actorUserId: req.user!.id,
        action: "BULK_END_CONTESTS",
        meta: { contestIds, endedContests, endedCount, errors }
      });

      res.json({ 
        success: true, 
        endedCount, 
        message: `Successfully ended ${endedCount} contests and distributed rewards`,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid input" });
    }
  });

  // Bulk delete contests
  app.delete("/api/admin/contests/bulk", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { contestIds } = z.object({ contestIds: z.array(z.string()).min(1) }).parse(req.body);
      
      let deletedCount = 0;
      const deletedContests = [];
      
      for (const contestId of contestIds) {
        const contest = await storage.getContest(contestId);
        if (contest) {
          await storage.deleteContest(contestId);
          deletedCount++;
          deletedContests.push({ id: contest.id, title: contest.title });
        }
      }

      // Log admin action
      await storage.createAuditLog({
        actorUserId: req.user!.id,
        action: "BULK_DELETE_CONTESTS",
        meta: { contestIds, deletedContests, deletedCount }
      });

      res.json({ success: true, deletedCount, message: `Successfully deleted ${deletedCount} contests` });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid input" });
    }
  });

  // Submission routes - optional auth (public can see approved, users can see approved + their own pending)
  app.get("/api/submissions", async (req: AuthRequest, res) => {
    try {
      // Try to authenticate but don't require it
      const authToken = req.cookies.authToken;
      let isUserAdmin = false;
      let currentUserId: string | undefined;
      
      if (authToken) {
        try {
          const decoded = jwt.verify(authToken, process.env.SESSION_SECRET!) as any;
          isUserAdmin = decoded.role === "admin";
          currentUserId = decoded.userId;
        } catch (error) {
          // Token invalid, treat as unauthenticated
        }
      }
      
      const { contestId, userId, status, page, limit } = req.query;
      
      // Parse pagination parameters
      const pageNum = page ? parseInt(page as string, 10) : 1;
      const limitNum = limit ? parseInt(limit as string, 10) : 20;
      
      // Validate pagination parameters
      const validPage = Math.max(1, pageNum);
      const validLimit = Math.min(Math.max(1, limitNum), 100); // Max 100 items per page
      
      // Admins can see all submissions with any status filter
      if (isUserAdmin) {
        const submissions = await storage.getSubmissions({
          contestId: contestId as string | undefined,
          userId: userId as string | undefined,
          status: status as string | undefined,
          page: validPage,
          limit: validLimit
        });
        return res.json(submissions);
      }
      
      // Regular users see approved submissions + their own submissions (any status)
      const approvedSubmissions = await storage.getSubmissions({
        contestId: contestId as string | undefined,
        userId: userId as string | undefined,
        status: "approved",
        page: validPage,
        limit: validLimit
      });
      
      // If user is authenticated, also get their own pending/rejected submissions
      if (currentUserId) {
        const ownSubmissions = await storage.getSubmissions({
          contestId: contestId as string | undefined,
          userId: currentUserId,
          status: undefined, // Get all statuses for own submissions
          page: 1,
          limit: 1000 // Get all user's own submissions without limit
        });
        
        // Merge and deduplicate (approved submissions might already be in the list)
        const submissionMap = new Map();
        [...approvedSubmissions, ...ownSubmissions].forEach(sub => {
          submissionMap.set(sub.id, sub);
        });
        
        // Return merged submissions without additional slicing
        return res.json(Array.from(submissionMap.values()));
      }
      
      // Unauthenticated users only see approved
      res.json(approvedSubmissions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  // Simple file upload endpoint for cover images, etc.
  app.post("/api/upload", authenticateToken, upload.single("file"), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "File is required" });
      }

      // Upload file and return URL
      const uploadResult = await uploadFile(req.file);
      res.status(200).json({ 
        url: uploadResult.url,
        thumbnailUrl: uploadResult.thumbnailUrl 
      });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  app.post("/api/submissions", authenticateToken, requireApproved, upload.single("file"), async (req: AuthRequest, res) => {
    try {
      const { contestId, title, description, type, mediaUrl, thumbnailUrl, paymentTxHash } = req.body;
      
      // Check if either file or mediaUrl is provided (gallery selection)
      if (!req.file && !mediaUrl) {
        return res.status(400).json({ error: "File or mediaUrl is required" });
      }

      if (!title || !type) {
        return res.status(400).json({ error: "Title and type are required" });
      }

      // Contest validation only if contestId is provided
      let contest = null;
      if (contestId) {
        contest = await storage.getContest(contestId);
        if (!contest) {
          return res.status(404).json({ error: "Contest not found" });
        }

        if (contest.status !== "active") {
          return res.status(400).json({ error: "Contest is not accepting submissions" });
        }

        // Check contest timing for submissions
        const now = new Date();
        if (now < contest.startAt) {
          return res.status(400).json({ error: "Contest has not started yet" });
        }
        if (now > contest.endAt) {
          return res.status(400).json({ error: "Contest has ended" });
        }

        // Check submission deadline from contest config
        const config = contest.config as any;
        if (config && config.submissionEndAt) {
          if (now > new Date(config.submissionEndAt)) {
            return res.status(400).json({ error: "Submission deadline has passed" });
          }
        }

        // Validate contest type - check if submission type matches contest allowed type
        if (config && config.contestType) {
          const contestType = config.contestType.toLowerCase();
          const submissionType = type.toLowerCase();
          
          if (contestType === 'image' && submissionType !== 'image') {
            return res.status(400).json({ error: "This contest only accepts image submissions" });
          }
          if (contestType === 'video' && submissionType !== 'video') {
            return res.status(400).json({ error: "This contest only accepts video submissions" });
          }
        }

        // Validate max submissions per user
        if (config && config.maxSubmissions) {
          const userSubmissionsCount = await storage.getUserSubmissionsInContest(req.user!.id, contestId);
          if (userSubmissionsCount >= config.maxSubmissions) {
            return res.status(400).json({ 
              error: `You have reached the maximum of ${config.maxSubmissions} submission(s) for this contest` 
            });
          }
        }

        // Validate file size limit (if uploading new file)
        if (req.file && config && config.fileSizeLimit) {
          const fileSizeMB = req.file.size / (1024 * 1024);
          if (fileSizeMB > config.fileSizeLimit) {
            return res.status(400).json({ 
              error: `File size exceeds the limit of ${config.fileSizeLimit}MB for this contest` 
            });
          }
        }

        // Wallet payment validation for contests requiring crypto payments
        if (config && config.entryFee && config.entryFeeAmount) {
          // Smart fallback: if no payment methods configured, allow both balance and wallet for crypto contests
          const isStandardCrypto = config.entryFeeCurrency && ['SOL', 'USDC'].includes(config.entryFeeCurrency);
          const defaultMethods = isStandardCrypto ? ['balance', 'wallet'] : ['balance'];
          const paymentMethods = config.entryFeePaymentMethods || defaultMethods;
          
          const allowsBalance = paymentMethods.includes('balance');
          const allowsWallet = paymentMethods.includes('wallet');

          // If wallet is the only payment method, require verified transaction
          if (allowsWallet && !allowsBalance) {
            if (!paymentTxHash) {
              return res.status(400).json({ 
                error: "This contest requires wallet payment. Please complete the payment with your Solana wallet." 
              });
            }

            // Verify the transaction exists and is valid
            const txRecord = await storage.getGloryTransactionByHash(paymentTxHash);
            if (!txRecord) {
              return res.status(400).json({ 
                error: "Payment transaction not verified. Please ensure your payment is confirmed on the blockchain." 
              });
            }

            // Verify transaction is for this contest and user
            if (txRecord.userId !== req.user!.id || txRecord.contestId !== contestId) {
              return res.status(400).json({ 
                error: "Payment transaction verification failed. Transaction does not match contest or user." 
              });
            }
          }
          // If balance payment is allowed, check balance (skip if wallet payment provided)
          else if (allowsBalance && !paymentTxHash) {
            const user = await storage.getUser(req.user!.id);
            if (!user) {
              return res.status(404).json({ error: "User not found" });
            }

            const currency = config.entryFeeCurrency || "GLORY";
            let balance = user.gloryBalance;
            if (currency === "SOL") balance = user.solBalance;
            else if (currency === "USDC") balance = user.usdcBalance;

            if (balance < config.entryFeeAmount) {
              return res.status(400).json({ 
                error: `Insufficient ${currency} balance. Entry fee is ${config.entryFeeAmount} ${currency}, you have ${balance} ${currency}` 
              });
            }
          }
        }
      }

      let finalMediaUrl: string;
      let finalThumbnailUrl: string | null = null;
      let cloudinaryPublicId: string | null = null;
      let cloudinaryResourceType: string | null = null;
      let isGalleryReuse = false;

      // Upload new file or use existing mediaUrl from gallery
      if (req.file) {
        const uploadResult = await uploadFile(req.file);
        finalMediaUrl = uploadResult.url;
        finalThumbnailUrl = uploadResult.thumbnailUrl || null;
        cloudinaryPublicId = uploadResult.cloudinaryPublicId || null;
        cloudinaryResourceType = uploadResult.cloudinaryResourceType || null;
      } else {
        // Using existing image from gallery - don't delete shared asset
        finalMediaUrl = mediaUrl;
        finalThumbnailUrl = thumbnailUrl || null;
        isGalleryReuse = true;
        // Note: cloudinaryPublicId stays null to prevent deletion of shared asset
      }

      // Create submission
      const submission = await storage.createSubmission({
        userId: req.user!.id,
        contestId: contestId || null,
        contestName: contest ? contest.title : null, // Preserve contest name for historical reference
        type,
        title,
        description: description || "",
        mediaUrl: finalMediaUrl,
        thumbnailUrl: finalThumbnailUrl,
        cloudinaryPublicId,
        cloudinaryResourceType,
        status: "pending" // Requires admin approval
      });

      // Deduct entry fee AFTER submission is successfully created
      // Only deduct from internal balance for GLORY currency (SOL/USDC/tokens are paid via wallet)
      if (contest && (contest.config as any)?.entryFee && (contest.config as any)?.entryFeeAmount) {
        const config = contest.config as any;
        const currency = config.entryFeeCurrency || "GLORY";
        
        // Only deduct from user balance if paying with GLORY (internal currency)
        // For SOL/USDC/tokens, payment happens via Solana wallet (verified by paymentTxHash)
        if (currency === "GLORY" && !paymentTxHash) {
          await storage.updateUserBalance(req.user!.id, -config.entryFeeAmount, currency);
          
          await storage.createGloryTransaction({
            userId: req.user!.id,
            delta: -config.entryFeeAmount,
            currency,
            reason: `Entry fee for contest: ${contest.title}`,
            contestId: contestId || null,
            submissionId: submission.id
          });
        }
      }

      res.status(201).json(submission);
    } catch (error) {
      console.error("Submission creation error:", error);
      res.status(500).json({ error: "Failed to create submission" });
    }
  });

  // Get single submission by ID (public with optional auth)
  app.get("/api/submissions/:id", async (req: AuthRequest, res) => {
    try {
      // Try to authenticate but don't require it
      const authToken = req.cookies.authToken;
      let isUserAdmin = false;
      let currentUserId: string | undefined;
      
      if (authToken) {
        try {
          const decoded = jwt.verify(authToken, process.env.SESSION_SECRET!) as any;
          isUserAdmin = decoded.role === "admin";
          currentUserId = decoded.userId;
        } catch (error) {
          // Token invalid, treat as unauthenticated
        }
      }

      const submission = await storage.getSubmission(req.params.id);
      
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Check access permissions
      const isOwnSubmission = currentUserId === submission.userId;
      const isApproved = submission.status === "approved";

      // Allow access if: admin, own submission, or approved submission
      if (!isUserAdmin && !isOwnSubmission && !isApproved) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Get user votes if authenticated
      let hasVoted = false;
      if (currentUserId) {
        const vote = await storage.getVote(currentUserId, submission.id);
        hasVoted = !!vote;
      }

      // Get user and contest info
      const user = await storage.getUser(submission.userId);
      let contest = null;
      if (submission.contestId) {
        contest = await storage.getContest(submission.contestId);
      }

      const enrichedSubmission = {
        ...submission,
        hasVoted,
        voteCount: submission.votesCount,
        user: user ? {
          id: user.id,
          username: user.username
        } : null,
        contest: contest ? {
          id: contest.id,
          title: contest.title,
          slug: contest.slug
        } : null
      };

      res.json(enrichedSubmission);
    } catch (error) {
      console.error("Error fetching submission:", error);
      res.status(500).json({ error: "Failed to fetch submission" });
    }
  });

  // User update own submission
  app.patch("/api/submissions/:id", authenticateToken, requireApproved, async (req: AuthRequest, res) => {
    try {
      const submission = await storage.getSubmission(req.params.id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Check if user owns the submission
      if (submission.userId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to update this submission" });
      }

      // Validate update data
      const updateSchema = z.object({
        title: z.string().min(1).max(255).optional(),
        description: z.string().max(5000).optional(),
        tags: z.array(z.string()).optional(),
      });

      const validatedData = updateSchema.parse(req.body);
      const updatedSubmission = await storage.updateSubmission(req.params.id, validatedData);
      res.json(updatedSubmission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Error updating submission:", error);
      res.status(500).json({ error: "Failed to update submission" });
    }
  });

  // User delete own submission
  app.delete("/api/submissions/:id", authenticateToken, requireApproved, async (req: AuthRequest, res) => {
    try {
      const submission = await storage.getSubmission(req.params.id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Check if user owns the submission
      if (submission.userId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to delete this submission" });
      }

      // Delete the submission media files if they exist
      if (submission.mediaUrl) {
        // Check if legacy submission (Cloudinary URL but no stored publicId)
        const isLegacy = submission.mediaUrl.includes('cloudinary.com') && !submission.cloudinaryPublicId;
        
        await deleteFile(
          submission.mediaUrl, 
          submission.cloudinaryPublicId || undefined,
          submission.cloudinaryResourceType || undefined,
          isLegacy
        ).catch(err => console.error("Failed to delete media:", err));
      }

      await storage.deleteSubmission(req.params.id);
      res.json({ message: "Submission deleted successfully" });
    } catch (error) {
      console.error("Error deleting submission:", error);
      res.status(500).json({ error: "Failed to delete submission" });
    }
  });

  // Admin get all submissions
  app.get("/api/admin/submissions", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { contestId, userId, status, page, limit } = req.query;
      
      const filters: any = {};
      if (contestId) filters.contestId = contestId as string;
      if (userId) filters.userId = userId as string;
      if (status && status !== 'all') filters.status = status as string;
      if (page) filters.page = parseInt(page as string, 10);
      if (limit) filters.limit = parseInt(limit as string, 10);
      
      const submissions = await storage.getSubmissions(filters);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching admin submissions:", error);
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  app.patch("/api/admin/submissions/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { status } = updateSubmissionStatusSchema.parse(req.body);
      const updatedSubmission = await storage.updateSubmission(req.params.id, { status });
      
      if (!updatedSubmission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Log admin action
      await storage.createAuditLog({
        actorUserId: req.user!.id,
        action: "UPDATE_SUBMISSION_STATUS",
        meta: { submissionId: updatedSubmission.id, status, userId: updatedSubmission.userId }
      });

      res.json(updatedSubmission);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid input" });
    }
  });

  app.delete("/api/admin/submissions/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const submission = await storage.getSubmission(req.params.id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Delete the file from storage (Cloudinary or local)
      const isLegacy = submission.mediaUrl.includes('cloudinary.com') && !submission.cloudinaryPublicId;
      
      await deleteFile(
        submission.mediaUrl,
        submission.cloudinaryPublicId || undefined,
        submission.cloudinaryResourceType || undefined,
        isLegacy
      );

      // Delete from database
      await storage.deleteSubmission(req.params.id);

      // Log admin action
      await storage.createAuditLog({
        actorUserId: req.user!.id,
        action: "DELETE_SUBMISSION",
        meta: { submissionId: submission.id, userId: submission.userId }
      });

      res.json({ message: "Submission deleted successfully" });
    } catch (error) {
      console.error("Error deleting submission:", error);
      res.status(500).json({ 
        error: "Failed to delete submission",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Bulk approve submissions
  app.patch("/api/admin/submissions/bulk/approve", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { submissionIds } = bulkSubmissionIdsSchema.parse(req.body);
      
      let count = 0;
      for (const id of submissionIds) {
        const updated = await storage.updateSubmission(id, { status: "approved" });
        if (updated) {
          count++;
          await storage.createAuditLog({
            actorUserId: req.user!.id,
            action: "UPDATE_SUBMISSION_STATUS",
            meta: { submissionId: id, status: "approved", userId: updated.userId }
          });
        }
      }
      
      res.json({ count, message: `${count} submission(s) approved` });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid input" });
    }
  });

  // Bulk reject submissions
  app.patch("/api/admin/submissions/bulk/reject", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { submissionIds } = bulkSubmissionIdsSchema.parse(req.body);
      
      let count = 0;
      for (const id of submissionIds) {
        const updated = await storage.updateSubmission(id, { status: "rejected" });
        if (updated) {
          count++;
          await storage.createAuditLog({
            actorUserId: req.user!.id,
            action: "UPDATE_SUBMISSION_STATUS",
            meta: { submissionId: id, status: "rejected", userId: updated.userId }
          });
        }
      }
      
      res.json({ count, message: `${count} submission(s) rejected` });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid input" });
    }
  });

  // Bulk delete submissions
  app.delete("/api/admin/submissions/bulk", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { submissionIds } = bulkSubmissionIdsSchema.parse(req.body);
      
      let count = 0;
      for (const id of submissionIds) {
        const submission = await storage.getSubmission(id);
        if (submission) {
          // Delete files from storage (Cloudinary or local)
          const isLegacy = submission.mediaUrl.includes('cloudinary.com') && !submission.cloudinaryPublicId;
          
          await deleteFile(
            submission.mediaUrl,
            submission.cloudinaryPublicId || undefined,
            submission.cloudinaryResourceType || undefined,
            isLegacy
          );
          
          // Delete from database
          await storage.deleteSubmission(id);
          
          // Log admin action
          await storage.createAuditLog({
            actorUserId: req.user!.id,
            action: "DELETE_SUBMISSION",
            meta: { submissionId: id, userId: submission.userId }
          });
          
          count++;
        }
      }
      
      res.json({ count, message: `${count} submission(s) deleted` });
    } catch (error) {
      console.error("Error deleting submissions:", error);
      res.status(500).json({ 
        error: "Failed to delete submissions",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Admin cleanup broken submissions
  app.post("/api/admin/cleanup-broken-submissions", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const allSubmissions = await storage.getSubmissions({ status: "approved" });
      const brokenSubmissions: string[] = [];
      
      // Check each submission's media URL
      for (const submission of allSubmissions) {
        try {
          // Try to fetch the URL to see if it exists
          const response = await fetch(submission.mediaUrl, { method: 'HEAD' });
          if (!response.ok) {
            brokenSubmissions.push(submission.id);
          }
        } catch (error) {
          // URL is broken or unreachable
          brokenSubmissions.push(submission.id);
        }
      }
      
      // Delete broken submissions
      let deletedCount = 0;
      for (const id of brokenSubmissions) {
        const submission = await storage.getSubmission(id);
        if (submission) {
          await storage.deleteSubmission(id);
          await storage.createAuditLog({
            actorUserId: req.user!.id,
            action: "DELETE_SUBMISSION",
            meta: { submissionId: id, userId: submission.userId, reason: "broken_media_url" }
          });
          deletedCount++;
        }
      }
      
      res.json({ 
        message: `Cleanup completed: ${deletedCount} broken submission(s) removed`,
        deletedCount,
        brokenSubmissionIds: brokenSubmissions
      });
    } catch (error) {
      console.error("Error during cleanup:", error);
      res.status(500).json({ 
        error: "Failed to cleanup broken submissions",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // User delete their own submission
  app.delete("/api/submissions/:id", authenticateToken, requireApproved, async (req: AuthRequest, res) => {
    try {
      const submission = await storage.getSubmission(req.params.id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Check if user owns this submission
      if (submission.userId !== req.user!.id) {
        return res.status(403).json({ error: "You can only delete your own submissions" });
      }

      // Delete the file from storage (Cloudinary or local)
      const isLegacy = submission.mediaUrl.includes('cloudinary.com') && !submission.cloudinaryPublicId;
      
      await deleteFile(
        submission.mediaUrl,
        submission.cloudinaryPublicId || undefined,
        submission.cloudinaryResourceType || undefined,
        isLegacy
      );

      // Delete from database
      await storage.deleteSubmission(req.params.id);

      res.json({ message: "Submission deleted successfully" });
    } catch (error) {
      console.error("Error deleting submission:", error);
      res.status(500).json({ 
        error: "Failed to delete submission",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Voting routes
  app.post("/api/votes", authenticateToken, requireApproved, async (req: AuthRequest, res) => {
    try {
      const { submissionId } = voteSubmissionSchema.parse(req.body);
      const userId = req.user!.id;

      // Check if submission exists
      const submission = await storage.getSubmission(submissionId);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      if (submission.status !== "approved") {
        return res.status(400).json({ error: "Cannot vote on unapproved submission" });
      }

      // Check if user is voting for their own submission
      if (submission.userId === userId) {
        return res.status(400).json({ error: "Cannot vote for your own submission" });
      }

      // Get contest to check voting rules and timing
      let contest = null;
      if (submission.contestId) {
        contest = await storage.getContest(submission.contestId);
        if (!contest) {
          return res.status(404).json({ error: "Contest not found" });
        }

        // Check if contest is active
        if (contest.status !== "active") {
          return res.status(400).json({ error: "Contest is not active" });
        }

        // Check contest timing
        const now = new Date();
        if (now < contest.startAt) {
          return res.status(400).json({ error: "Contest has not started yet" });
        }
        if (now > contest.endAt) {
          return res.status(400).json({ error: "Contest has ended" });
        }

        // Check voting timing from contest config
        const config = contest.config as any;
        if (config) {
          if (config.votingStartAt && now < new Date(config.votingStartAt)) {
            return res.status(400).json({ error: "Voting has not started yet" });
          }
          if (config.votingEndAt && now > new Date(config.votingEndAt)) {
            return res.status(400).json({ error: "Voting period has ended" });
          }
          if (config.submissionEndAt && config.submissionEndAt !== config.votingEndAt && now > new Date(config.submissionEndAt)) {
            // Allow voting even after submission deadline if voting end is different
          }

          // Check jury voting restrictions (only if jury is the ONLY voting method)
          if (config.votingMethods && config.votingMethods.length === 1 && config.votingMethods.includes('jury')) {
            // If ONLY jury voting is enabled, check if user is in jury list
            if (config.juryMembers && Array.isArray(config.juryMembers)) {
              if (!config.juryMembers.includes(userId)) {
                return res.status(403).json({ 
                  error: "Only jury members can vote in this contest" 
                });
              }
            }
          }
        }

        // Check contest-specific voting frequency rules
        if (config && config.votesPerUserPerPeriod && config.periodDurationHours) {
          const periodStart = new Date(now.getTime() - (config.periodDurationHours * 60 * 60 * 1000));
          const votesInPeriod = await storage.getVoteCountForSubmissionInPeriod(userId, submissionId, periodStart);
          
          if (votesInPeriod >= config.votesPerUserPerPeriod) {
            return res.status(400).json({ 
              error: `You can only vote ${config.votesPerUserPerPeriod} time(s) per submission every ${config.periodDurationHours} hours`,
              nextVoteAllowed: new Date(now.getTime() + (config.periodDurationHours * 60 * 60 * 1000))
            });
          }
        }

        // Check total votes limit for contest
        if (config && config.totalVotesPerUser && config.totalVotesPerUser > 0) {
          const totalVotesInContest = await storage.getUserTotalVotesInContest(userId, submission.contestId!);
          
          if (totalVotesInContest >= config.totalVotesPerUser) {
            return res.status(400).json({ 
              error: `You have reached the maximum of ${config.totalVotesPerUser} votes for this contest`
            });
          }
        }
      }

      // Note: Multiple votes per submission are now allowed based on contest votesPerUserPerPeriod config
      // The period-based check above enforces the voting frequency rules

      // Check general rate limit (30 votes per hour per user) - keeping as backup
      const rateLimitKey = `vote:${userId}`;
      if (!votingRateLimiter.isAllowed(rateLimitKey)) {
        return res.status(429).json({ 
          error: "Rate limit exceeded. Maximum 30 votes per hour.",
          resetTime: votingRateLimiter.getResetTime(rateLimitKey)
        });
      }

      // Create vote
      const vote = await storage.createVote({ userId, submissionId });

      // Calculate remaining information for response
      let remainingInfo: any = {
        remainingVotes: votingRateLimiter.getRemainingRequests(rateLimitKey)
      };

      if (contest && submission.contestId) {
        const config = contest.config as any;
        if (config && config.totalVotesPerUser && config.totalVotesPerUser > 0) {
          const totalVotesInContest = await storage.getUserTotalVotesInContest(userId, submission.contestId);
          remainingInfo.remainingContestVotes = config.totalVotesPerUser - totalVotesInContest;
        }
      }

      res.status(201).json({ 
        message: "Vote recorded successfully",
        ...remainingInfo
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid input" });
    }
  });

  // Get voting status for a user and submission/contest
  app.get("/api/votes/status", authenticateToken, requireApproved, async (req: AuthRequest, res) => {
    try {
      const { submissionId, contestId } = req.query;
      const userId = req.user!.id;

      if (!submissionId && !contestId) {
        return res.status(400).json({ error: "Either submissionId or contestId is required" });
      }

      let contest = null;
      let submission = null;

      if (submissionId) {
        submission = await storage.getSubmission(submissionId as string);
        if (!submission) {
          return res.status(404).json({ error: "Submission not found" });
        }
        if (submission.contestId) {
          contest = await storage.getContest(submission.contestId);
        }
      } else if (contestId) {
        contest = await storage.getContest(contestId as string);
        if (!contest) {
          return res.status(404).json({ error: "Contest not found" });
        }
      }

      const now = new Date();
      const response: any = {
        canVote: true,
        reasons: [],
        votingStatus: {
          generalRateLimit: votingRateLimiter.getRemainingRequests(`vote:${userId}`)
        }
      };

      // Check general conditions
      if (submission && submission.userId === userId) {
        response.canVote = false;
        response.reasons.push("Cannot vote for your own submission");
      }

      if (submission && submission.status !== "approved") {
        response.canVote = false;
        response.reasons.push("Submission is not approved for voting");
      }

      // Check contest-specific conditions
      if (contest) {
        if (contest.status !== "active") {
          response.canVote = false;
          response.reasons.push("Contest is not active");
        }

        if (now < contest.startAt) {
          response.canVote = false;
          response.reasons.push("Contest has not started yet");
        }

        if (now > contest.endAt) {
          response.canVote = false;
          response.reasons.push("Contest has ended");
        }

        const config = contest.config as any;
        if (config) {
          // Check voting period
          if (config.votingStartAt && now < new Date(config.votingStartAt)) {
            response.canVote = false;
            response.reasons.push("Voting has not started yet");
            response.votingStartsAt = config.votingStartAt;
          }

          if (config.votingEndAt && now > new Date(config.votingEndAt)) {
            response.canVote = false;
            response.reasons.push("Voting period has ended");
          }

          // Check voting frequency limits
          if (submissionId && config.votesPerUserPerPeriod && config.periodDurationHours) {
            const periodStart = new Date(now.getTime() - (config.periodDurationHours * 60 * 60 * 1000));
            const votesInPeriod = await storage.getVoteCountForSubmissionInPeriod(userId, submissionId as string, periodStart);
            
            response.votingStatus.periodInfo = {
              votesInPeriod,
              maxVotesPerPeriod: config.votesPerUserPerPeriod,
              periodDurationHours: config.periodDurationHours,
              canVoteInPeriod: votesInPeriod < config.votesPerUserPerPeriod
            };

            if (votesInPeriod >= config.votesPerUserPerPeriod) {
              response.canVote = false;
              response.reasons.push(`Maximum ${config.votesPerUserPerPeriod} votes per ${config.periodDurationHours} hours reached for this submission`);
              response.nextVoteAllowed = new Date(now.getTime() + (config.periodDurationHours * 60 * 60 * 1000));
            }
          }

          // Check total votes limit
          if (config.totalVotesPerUser && config.totalVotesPerUser > 0) {
            const totalVotesInContest = await storage.getUserTotalVotesInContest(userId, contest.id);
            
            response.votingStatus.contestInfo = {
              totalVotesInContest,
              maxTotalVotes: config.totalVotesPerUser,
              remainingVotes: Math.max(0, config.totalVotesPerUser - totalVotesInContest)
            };

            if (totalVotesInContest >= config.totalVotesPerUser) {
              response.canVote = false;
              response.reasons.push(`Maximum ${config.totalVotesPerUser} total votes reached for this contest`);
            }
          }
        }
      }

      // Check if already voted for this specific submission
      if (submissionId) {
        const existingVote = await storage.getVote(userId, submissionId as string);
        if (existingVote) {
          response.canVote = false;
          response.reasons.push("Already voted for this submission");
          response.votedAt = existingVote.createdAt;
        }
      }

      res.json(response);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to get voting status" });
    }
  });

  // User management routes
  app.get("/api/admin/users", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { status, role } = req.query;
      const users = await storage.getUsersWithFilters({
        status: status as string,
        role: role as string
      });

      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { status } = updateUserStatusSchema.parse(req.body);
      const updatedUser = await storage.updateUser(req.params.id, { status });
      
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Log admin action
      await storage.createAuditLog({
        actorUserId: req.user!.id,
        action: "UPDATE_USER_STATUS",
        meta: { targetUserId: updatedUser.id, status, username: updatedUser.username }
      });

      res.json(updatedUser);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid input" });
    }
  });

  // Bulk approve users route
  app.patch("/api/admin/users/bulk/approve", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { userIds } = z.object({ userIds: z.array(z.string()).min(1) }).parse(req.body);
      
      let updatedCount = 0;
      const updatedUsers = [];
      
      for (const userId of userIds) {
        const user = await storage.updateUser(userId, { status: "approved" });
        if (user) {
          updatedCount++;
          updatedUsers.push({ id: user.id, username: user.username, email: user.email });
        }
      }

      // Log admin action
      await storage.createAuditLog({
        actorUserId: req.user!.id,
        action: "BULK_APPROVE_USERS",
        meta: { userIds, updatedUsers, updatedCount }
      });

      res.json({ success: true, updatedCount, message: `Successfully approved ${updatedCount} users` });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid input" });
    }
  });

  // Bulk delete users route
  app.delete("/api/admin/users/bulk", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {

    
    try {
      // Ensure we always send JSON responses
      res.setHeader('Content-Type', 'application/json');
      
      const { userIds } = req.body;
      
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: "User IDs array is required" });
      }

      // Check if storage methods exist
      if (typeof storage.getUsersByIds !== 'function') {
        console.error("ERROR: storage.getUsersByIds is not a function");
        return res.status(500).json({ error: "Storage method getUsersByIds not implemented" });
      }

      if (typeof storage.bulkDeleteUsers !== 'function') {
        console.error("ERROR: storage.bulkDeleteUsers is not a function");
        return res.status(500).json({ error: "Storage method bulkDeleteUsers not implemented" });
      }

      // Get user details before deletion for audit logging
      const usersToDelete = await storage.getUsersByIds(userIds);
      
      if (usersToDelete.length === 0) {
        return res.status(404).json({ error: "No users found to delete" });
      }

      // Delete users and all associated data
      const deletedCount = await storage.bulkDeleteUsers(userIds);

      // Log the bulk deletion
      await storage.createAuditLog({
        actorUserId: req.user!.id,
        action: "BULK_DELETE_USERS",
        meta: {
          deletedUserIds: userIds,
          deletedUsers: usersToDelete.map(u => ({
            id: u.id,
            username: u.username,
            email: u.email
          })),
          deletedCount
        }
      });


      
      res.json({ 
        success: true, 
        deletedCount,
        message: `Successfully deleted ${deletedCount} users and all associated data`
      });

    } catch (error) {
      
      // Ensure we send JSON error response
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ error: "Failed to delete users", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Update user balance route (supports GLORY, SOL, USDC)
  app.patch("/api/admin/users/:id/balance", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { amount, operation, currency = "GLORY" } = req.body;
      const userId = req.params.id;
      
      // Generate unique request ID to track duplicates
      const requestId = `${Date.now()}-${Math.random()}`;
      

      
      // Additional protection: Global rate limit per admin user (max 1 balance operation per 3 seconds)
      const adminRateLimitKey = `admin-balance:${req.user!.id}`;
      const lastAdminRequest = recentGloryRequests.get(adminRateLimitKey);
      if (lastAdminRequest && (Date.now() - lastAdminRequest) < 3000) {
        return res.status(429).json({ error: "Please wait before making another balance change." });
      }
      
      // Create request signature to detect duplicates
      const requestSignature = `${userId}-${amount}-${operation}-${currency}`;
      const now = Date.now();
      const lastRequest = recentGloryRequests.get(requestSignature);
      
      // If same request within 5 seconds, reject as duplicate (increased from 2 seconds)
      if (lastRequest && (now - lastRequest) < 5000) {
        return res.status(429).json({ error: "Duplicate request detected. Please wait before trying again." });
      }
      
      // Store this request and admin rate limit
      recentGloryRequests.set(requestSignature, now);
      recentGloryRequests.set(adminRateLimitKey, now);
      
      // Clean up old entries (older than 10 seconds)
      const keysToDelete: string[] = [];
      recentGloryRequests.forEach((timestamp, key) => {
        if (now - timestamp > 10000) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => recentGloryRequests.delete(key));
      

      
      if (typeof amount !== 'number' || amount < 0 || isNaN(amount)) {
        return res.status(400).json({ error: "Valid amount (including 0) is required" });
      }
      
      if (!['set', 'add', 'subtract'].includes(operation)) {
        return res.status(400).json({ error: "Invalid operation. Must be 'set', 'add', or 'subtract'" });
      }

      // Get current user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }



      let newBalance: number;
      let delta: number;
      let reason: string;
      let currentBalance = user.gloryBalance;
      
      if (currency === "SOL") currentBalance = user.solBalance;
      else if (currency === "USDC") currentBalance = user.usdcBalance;

      switch (operation) {
        case 'set':
          newBalance = amount;
          delta = amount - currentBalance;
          reason = `Admin set balance to ${amount} ${currency}`;

          break;
        case 'add':
          newBalance = currentBalance + amount;
          delta = amount;
          reason = `Admin added ${amount} ${currency}`;

          break;
        case 'subtract':
          newBalance = Math.max(0, currentBalance - amount);
          delta = -(Math.min(amount, currentBalance));
          reason = `Admin subtracted ${Math.min(amount, currentBalance)} ${currency}`;

          break;
        default:
          return res.status(400).json({ error: "Invalid operation" });
      }

      // Create transaction record which will also update user balance
      if (delta !== 0) {
        await storage.createGloryTransaction({
          userId,
          delta,
          currency,
          reason,
          contestId: null,
          submissionId: null
        });
      }

      // Get updated user to return latest balance
      const updatedUser = await storage.getUser(userId);
      if (!updatedUser) {
        return res.status(500).json({ error: "Failed to get updated user balance" });
      }

      // Get final balance based on currency
      let finalBalance = updatedUser.gloryBalance;
      if (currency === "SOL") finalBalance = updatedUser.solBalance;
      else if (currency === "USDC") finalBalance = updatedUser.usdcBalance;

      // Log admin action
      await storage.createAuditLog({
        actorUserId: req.user!.id,
        action: "UPDATE_USER_BALANCE",
        meta: { 
          targetUserId: userId, 
          operation,
          amount,
          currency,
          oldBalance: currentBalance,
          newBalance: finalBalance,
          delta
        }
      });



      res.json({ 
        success: true,
        newBalance: finalBalance,
        delta,
        operation,
        currency,
        message: `${currency} balance ${operation === 'set' ? 'set to' : operation === 'add' ? 'increased by' : 'decreased by'} ${amount}`,
        userData: {
          id: updatedUser.id,
          username: updatedUser.username,
          gloryBalance: updatedUser.gloryBalance,
          solBalance: updatedUser.solBalance,
          usdcBalance: updatedUser.usdcBalance
        }
      });
    } catch (error) {
      console.error("Error updating GLORY balance:", error);
      res.status(500).json({ error: "Failed to update GLORY balance" });
    }
  });





  // Admin cashout management routes
  app.get("/api/admin/cashout/requests", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { status } = req.query;
      const requests = await storage.getCashoutRequests(
        status ? { status: status as string } : undefined
      );
      res.json({ requests });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cashout requests" });
    }
  });

  app.patch("/api/admin/cashout/requests/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { status, rejectionReason, txHash } = updateCashoutStatusSchema.parse(req.body);
      const requestId = req.params.id;
      const adminId = req.user!.id;

      // Get the current request
      const request = await storage.getCashoutRequest(requestId);
      if (!request) {
        return res.status(404).json({ error: "Cashout request not found" });
      }

      const oldStatus = request.status;

      // Validate txHash is required for "sent" and "confirmed" statuses
      if ((status === "sent" || status === "confirmed") && !txHash) {
        return res.status(400).json({ error: `Transaction hash is required for status: ${status}` });
      }

      // Update the request
      const updatedRequest = await storage.updateCashoutRequest(requestId, {
        status,
        adminId,
        rejectionReason: status === "rejected" ? rejectionReason : undefined,
        txHash: status === "sent" || status === "confirmed" ? txHash : undefined
      });

      if (!updatedRequest) {
        return res.status(404).json({ error: "Cashout request not found" });
      }

      // Create event log
      await storage.createCashoutEvent({
        cashoutRequestId: requestId,
        fromStatus: oldStatus,
        toStatus: status,
        actorUserId: adminId,
        notes: rejectionReason || txHash || `Status updated to ${status}`
      });

      // Handle GLORY balance changes
      if (status === "approved" && oldStatus === "pending") {
        // Deduct GLORY when approving pending request
        await storage.createGloryTransaction({
          userId: request.userId,
          delta: -request.amountGlory,
          reason: `Cashout request approved`,
          contestId: null,
          submissionId: null
        });
      } else if ((status === "rejected" || status === "failed") && (oldStatus === "approved" || oldStatus === "processing" || oldStatus === "sent")) {
        // Refund GLORY if an approved/processing/sent request is rejected or failed
        await storage.createGloryTransaction({
          userId: request.userId,
          delta: request.amountGlory,
          reason: `Cashout request ${status} - GLORY refunded`,
          contestId: null,
          submissionId: null
        });
      }

      // Log admin action
      await storage.createAuditLog({
        actorUserId: adminId,
        action: "UPDATE_CASHOUT_STATUS",
        meta: { 
          cashoutRequestId: requestId, 
          oldStatus, 
          newStatus: status,
          userId: request.userId,
          amountGlory: request.amountGlory,
          txHash: txHash || null
        }
      });

      res.json({ request: updatedRequest });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update cashout request" });
    }
  });

  app.post("/api/admin/cashout/approve", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { requestId } = approveCashoutSchema.parse(req.body);
      const adminId = req.user!.id;

      const request = await storage.getCashoutRequest(requestId);
      if (!request) {
        return res.status(404).json({ error: "Cashout request not found" });
      }

      if (request.status !== "pending") {
        return res.status(400).json({ error: "Only pending requests can be approved" });
      }

      const updatedRequest = await storage.updateCashoutRequest(requestId, {
        status: "approved",
        adminId
      });

      await storage.createCashoutEvent({
        cashoutRequestId: requestId,
        fromStatus: "pending",
        toStatus: "approved",
        actorUserId: adminId,
        notes: "Request approved by admin"
      });

      await storage.createGloryTransaction({
        userId: request.userId,
        delta: -request.amountGlory,
        reason: `Cashout request approved`,
        contestId: null,
        submissionId: null
      });

      await storage.createAuditLog({
        actorUserId: adminId,
        action: "APPROVE_CASHOUT",
        meta: { 
          cashoutRequestId: requestId,
          userId: request.userId,
          amountGlory: request.amountGlory
        }
      });

      res.json({ request: updatedRequest });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to approve cashout request" });
    }
  });

  app.post("/api/admin/cashout/reject", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { requestId, rejectionReason } = rejectCashoutSchema.parse(req.body);
      const adminId = req.user!.id;

      const request = await storage.getCashoutRequest(requestId);
      if (!request) {
        return res.status(404).json({ error: "Cashout request not found" });
      }

      if (request.status !== "pending") {
        return res.status(400).json({ error: "Only pending requests can be rejected" });
      }

      const updatedRequest = await storage.updateCashoutRequest(requestId, {
        status: "rejected",
        adminId,
        rejectionReason
      });

      await storage.createCashoutEvent({
        cashoutRequestId: requestId,
        fromStatus: "pending",
        toStatus: "rejected",
        actorUserId: adminId,
        notes: rejectionReason || "Request rejected by admin"
      });

      await storage.createAuditLog({
        actorUserId: adminId,
        action: "REJECT_CASHOUT",
        meta: { 
          cashoutRequestId: requestId,
          userId: request.userId,
          amountGlory: request.amountGlory,
          reason: rejectionReason
        }
      });

      res.json({ request: updatedRequest });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to reject cashout request" });
    }
  });

  app.post("/api/admin/cashout/bulk-approve", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { requestIds } = bulkCashoutIdsSchema.parse(req.body);
      const adminId = req.user!.id;

      let approvedCount = 0;
      const errors: string[] = [];

      for (const requestId of requestIds) {
        try {
          const request = await storage.getCashoutRequest(requestId);
          if (!request) {
            errors.push(`Request ${requestId} not found`);
            continue;
          }

          if (request.status !== "pending") {
            errors.push(`Request ${requestId} is not pending`);
            continue;
          }

          await storage.updateCashoutRequest(requestId, {
            status: "approved",
            adminId
          });

          await storage.createCashoutEvent({
            cashoutRequestId: requestId,
            fromStatus: "pending",
            toStatus: "approved",
            actorUserId: adminId,
            notes: "Request approved by admin (bulk operation)"
          });

          await storage.createGloryTransaction({
            userId: request.userId,
            delta: -request.amountGlory,
            reason: `Cashout request approved`,
            contestId: null,
            submissionId: null
          });

          await storage.createAuditLog({
            actorUserId: adminId,
            action: "APPROVE_CASHOUT",
            meta: { 
              cashoutRequestId: requestId,
              userId: request.userId,
              amountGlory: request.amountGlory,
              bulkOperation: true
            }
          });

          approvedCount++;
        } catch (error) {
          errors.push(`Failed to approve request ${requestId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      res.json({ 
        approvedCount,
        totalRequested: requestIds.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to bulk approve cashout requests" });
    }
  });

  app.post("/api/admin/cashout/bulk-reject", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { requestIds, rejectionReason } = bulkRejectCashoutSchema.parse(req.body);
      const adminId = req.user!.id;

      let rejectedCount = 0;
      const errors: string[] = [];

      for (const requestId of requestIds) {
        try {
          const request = await storage.getCashoutRequest(requestId);
          if (!request) {
            errors.push(`Request ${requestId} not found`);
            continue;
          }

          if (request.status !== "pending") {
            errors.push(`Request ${requestId} is not pending`);
            continue;
          }

          await storage.updateCashoutRequest(requestId, {
            status: "rejected",
            adminId,
            rejectionReason
          });

          await storage.createCashoutEvent({
            cashoutRequestId: requestId,
            fromStatus: "pending",
            toStatus: "rejected",
            actorUserId: adminId,
            notes: rejectionReason || "Request rejected by admin (bulk operation)"
          });

          await storage.createAuditLog({
            actorUserId: adminId,
            action: "REJECT_CASHOUT",
            meta: { 
              cashoutRequestId: requestId,
              userId: request.userId,
              amountGlory: request.amountGlory,
              reason: rejectionReason,
              bulkOperation: true
            }
          });

          rejectedCount++;
        } catch (error) {
          errors.push(`Failed to reject request ${requestId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      res.json({ 
        rejectedCount,
        totalRequested: requestIds.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to bulk reject cashout requests" });
    }
  });

  // Transaction history route (supports currency filter)
  app.get("/api/glory-ledger", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { currency } = req.query;
      const transactions = await storage.getGloryTransactions(
        req.user!.id, 
        currency as string | undefined
      );
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.delete("/api/glory-ledger", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Clear all glory transactions for the user without affecting balance
      await storage.clearGloryTransactions(req.user!.id);

      res.json({ message: "All GLORY history cleared successfully" });
    } catch (error) {
      console.error("Error clearing glory history:", error);
      res.status(500).json({ error: "Failed to clear GLORY history" });
    }
  });

  // Audit logs route
  app.get("/api/admin/audit-logs", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { limit } = req.query;
      const logs = await storage.getAuditLogs(limit ? parseInt(limit as string) : undefined);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  app.delete("/api/admin/audit-logs", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      await storage.clearAuditLogs();
      
      await storage.createAuditLog({
        actorUserId: req.user!.id,
        action: "CLEAR_AUDIT_LOGS",
        meta: { clearedAt: new Date().toISOString() }
      });
      
      res.json({ message: "All audit logs cleared successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear audit logs" });
    }
  });

  // Site Settings routes (Admin only)
  app.get("/api/admin/settings", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const settings = await storage.getSiteSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch site settings" });
    }
  });

  app.patch("/api/admin/settings", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      // Validate the request body using partial schema for updates
      const updateSchema = insertSiteSettingsSchema.partial();
      const updates = updateSchema.parse(req.body);
      
      const settings = await storage.updateSiteSettings(updates);
      
      // Log the change in audit log
      await storage.createAuditLog({
        actorUserId: req.user!.id,
        action: "UPDATE_SITE_SETTINGS",
        meta: { updates }
      });
      
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update site settings" });
    }
  });

  // Public endpoint to check if site is in private mode (no auth required)
  app.get("/api/settings/private-mode", async (req, res) => {
    try {
      const settings = await storage.getSiteSettings();
      res.json({ privateMode: settings.privateMode });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch private mode status" });
    }
  });

  // Public endpoint to get platform wallet address (for payment flows)
  app.get("/api/settings/platform-wallet", async (req, res) => {
    try {
      const settings = await storage.getSiteSettings();
      res.json({ platformWalletAddress: settings.platformWalletAddress || null });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch platform wallet address" });
    }
  });

  // Placeholder for video thumbnails in local mode
  app.get("/api/placeholder/video-thumbnail", (req, res) => {
    // Return a simple SVG placeholder for video thumbnails
    const svg = `
      <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1a1a1a"/>
        <circle cx="200" cy="200" r="60" fill="#7C3CEC" opacity="0.8"/>
        <polygon points="180,170 180,230 230,200" fill="white"/>
        <text x="200" y="280" text-anchor="middle" fill="#666" font-family="Arial" font-size="16">Video Thumbnail</text>
      </svg>
    `;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  });

  // AI Generation routes
  const { generateImage, AI_MODELS } = await import("./ai-service");
  
  // Get available AI models and their configurations
  app.get("/api/ai/models", (req, res) => {
    const models = Object.values(AI_MODELS).map(model => ({
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

  // Get pricing settings for all models and upscaling
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
  
  // AI generation rate limiter (30 generations per hour per user)
  const aiGenerationRateLimiter = async (req: AuthRequest): Promise<boolean> => {
    if (!req.user) return false;
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentGenerations = await storage.getAiGenerations(req.user.id, 1000); // Get more to count in last hour
    const generationsInLastHour = recentGenerations.filter(g => new Date(g.createdAt) > oneHourAgo);
    
    return generationsInLastHour.length < 30; // Max 30 per hour
  };
  
  // Generate image validation schema
  const generateImageSchema = z.object({
    prompt: z.string().min(3, "Prompt must be at least 3 characters").max(1000, "Prompt too long"),
    model: z.enum(["ideogram-v3", "nano-banana", "flux-1.1-pro", "sd-3.5-large", "leonardo-lucid"]).optional(),
    seed: z.number().int().optional(),
    
    // Dimension options
    aspectRatio: z.string().optional(),
    width: z.number().min(256).max(1440).optional(),
    height: z.number().min(256).max(1440).optional(),
    resolution: z.string().optional(),
    
    // Output options
    outputFormat: z.enum(["webp", "png", "jpg"]).optional(),
    outputQuality: z.number().min(0).max(100).optional(),
    
    // Prompt modifiers
    negativePrompt: z.string().max(500).optional(),
    promptUpsampling: z.boolean().optional(),
    promptEnhance: z.boolean().optional(),
    magicPromptOption: z.enum(["Auto", "On", "Off"]).optional(),
    
    // Image input
    imageInput: z.union([z.string(), z.array(z.string())]).optional(),
    mask: z.string().optional(),
    
    // Style options (Ideogram)
    styleType: z.string().optional(),
    stylePreset: z.string().optional(),
    styleReferenceImages: z.array(z.string()).optional(),
    
    // Leonardo options
    leonardoStyle: z.string().optional(),
    contrast: z.enum(["low", "medium", "high"]).optional(),
    generationMode: z.enum(["standard", "ultra"]).optional(),
    numImages: z.number().min(1).max(8).optional(),
    
    // Flux options
    safetyTolerance: z.number().min(1).max(6).optional(),
    
    // Stable Diffusion options
    cfg: z.number().min(1).max(10).optional(),
    promptStrength: z.number().min(0).max(1).optional(),
  });

  // Map model IDs to pricing keys
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

  app.post("/api/ai/generate", authenticateToken, requireApproved, async (req: AuthRequest, res) => {
    // Check rate limit
    const canGenerate = await aiGenerationRateLimiter(req);
    if (!canGenerate) {
      return res.status(429).json({ error: "Rate limit exceeded. Maximum 30 generations per hour." });
    }
    try {
      const params = generateImageSchema.parse(req.body);
      const userId = req.user!.id;
      const modelId = params.model || "flux-1.1-pro";

      // Auto-refresh subscription credits if period has expired
      try {
        await storage.refreshSubscriptionIfNeeded(userId);
      } catch (error) {
        console.error("Failed to refresh subscription in AI generation:", error);
      }

      // Check tier-based model access
      const hasModelAccess = await storage.canUserAccessModel(userId, modelId);
      if (!hasModelAccess) {
        return res.status(403).json({ 
          error: "Your subscription tier does not have access to this AI model. Please upgrade your plan to use this model.",
          model: modelId
        });
      }

      // Get model cost from pricing settings using pricing key
      const pricingKey = modelToPricingKey(modelId);
      const modelCost = await storage.getPricingSetting(pricingKey);
      if (!modelCost) {
        return res.status(500).json({ error: "Model pricing not configured" });
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
          current: userCredits
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
        const results = await generateImage(params);

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
          results.map(result => 
            storage.createAiGeneration({
              userId,
              prompt: params.prompt,
              model: result.parameters.model,
              imageUrl: result.url,
              parameters: result.parameters,
              cloudinaryPublicId: result.cloudinaryPublicId,
              status: "generated",
              creditsUsed: creditsPerImage
            })
          )
        );

        // Return all generated images using data from database records
        res.json({ 
          images: generations.map(gen => ({
            id: gen.id,
            imageUrl: gen.imageUrl,
            cloudinaryUrl: gen.imageUrl, // Already points to Cloudinary if upload succeeded
            cloudinaryPublicId: gen.cloudinaryPublicId,
            parameters: gen.parameters,
          })),
          creditsUsed: actualCost,
          creditsRemaining: userCredits - actualCost
        });
      } catch (generationError) {
        // Refund credits if generation failed
        await storage.addCredits(userId, totalCost);
        throw generationError;
      }
    } catch (error) {
      console.error("AI generation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid parameters", details: error.errors });
      }
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate image" 
      });
    }
  });

  app.get("/api/ai/generations", authenticateToken, requireApproved, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { limit = 20 } = req.query;
      
      const generations = await storage.getAiGenerations(userId, parseInt(limit as string));
      res.json(generations);
    } catch (error) {
      console.error("Error fetching AI generations:", error);
      res.status(500).json({ error: "Failed to fetch generations" });
    }
  });

  app.get("/api/ai/generations/:id", authenticateToken, requireApproved, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const generation = await storage.getAiGeneration(id);
      if (!generation) {
        return res.status(404).json({ error: "Generation not found" });
      }

      if (generation.userId !== userId) {
        return res.status(403).json({ error: "Not authorized to access this generation" });
      }

      res.json(generation);
    } catch (error) {
      console.error("Error fetching AI generation:", error);
      res.status(500).json({ error: "Failed to fetch generation" });
    }
  });

  app.delete("/api/ai/generations/:id", authenticateToken, requireApproved, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const generation = await storage.getAiGeneration(id);
      if (!generation) {
        return res.status(404).json({ error: "Generation not found" });
      }

      if (generation.userId !== userId) {
        return res.status(403).json({ error: "Not authorized to delete this generation" });
      }

      await storage.deleteAiGeneration(id);
      res.json({ message: "Generation deleted successfully" });
    } catch (error) {
      console.error("Error deleting AI generation:", error);
      res.status(500).json({ error: "Failed to delete generation" });
    }
  });

  // Submit AI generation to contest
  const submitToContestSchema = z.object({
    contestId: z.string(),
    title: z.string().min(1, "Title is required").max(255),
    description: z.string().optional(),
    tags: z.array(z.string()).optional()
  });

  app.post("/api/ai/generations/:id/submit-to-contest", authenticateToken, requireApproved, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const params = submitToContestSchema.parse(req.body);

      // Get AI generation
      const generation = await storage.getAiGeneration(id);
      if (!generation) {
        return res.status(404).json({ error: "AI generation not found" });
      }

      if (generation.userId !== userId) {
        return res.status(403).json({ error: "Not authorized to submit this generation" });
      }

      if (!generation.cloudinaryPublicId) {
        return res.status(400).json({ error: "Image not properly uploaded to storage" });
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
        return res.status(400).json({ error: "This contest does not accept images" });
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
        status: "pending" // Will need admin approval
      });

      // Note: AI generation status remains as "generated" - we don't update it
      // The submission itself tracks the contest entry

      res.json({ 
        message: "Successfully submitted to contest",
        submission 
      });
    } catch (error) {
      console.error("Error submitting AI generation to contest:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid parameters", details: error.errors });
      }
      res.status(500).json({ error: "Failed to submit to contest" });
    }
  });

  // Admin pricing management
  app.get("/api/admin/settings/pricing", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
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
  });

  app.put("/api/admin/settings/pricing/:key", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { key } = req.params;
      const { value } = z.object({ value: z.number().min(0) }).parse(req.body);
      
      await storage.updatePricingSetting(key, value);
      res.json({ message: "Pricing updated successfully", key, value });
    } catch (error) {
      console.error("Error updating pricing:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid value", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update pricing" });
    }
  });

  // Upscale AI generation image
  const upscaleSchema = z.object({
    generationId: z.string(),
    scale: z.number().min(2).max(10).optional(),
    faceEnhance: z.boolean().optional()
  });

  app.post("/api/ai/upscale", authenticateToken, requireApproved, async (req: AuthRequest, res) => {
    try {
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
          error: "Your subscription tier does not have access to AI upscaling. Please upgrade your plan to use this feature."
        });
      }

      // Get AI generation
      const generation = await storage.getAiGeneration(params.generationId);
      if (!generation) {
        return res.status(404).json({ error: "AI generation not found" });
      }

      if (generation.userId !== userId) {
        return res.status(403).json({ error: "Not authorized to upscale this generation" });
      }

      if (generation.isUpscaled) {
        return res.status(400).json({ error: "This image has already been upscaled" });
      }

      // Get upscale cost from pricing settings
      const upscaleCost = await storage.getPricingSetting("upscale");
      if (!upscaleCost) {
        return res.status(500).json({ error: "Upscaling pricing not configured" });
      }

      // Check if user has enough credits
      const userCredits = await storage.getUserCredits(userId);
      if (userCredits < upscaleCost) {
        return res.status(402).json({ 
          error: `Insufficient credits. Upscaling costs ${upscaleCost} credits. You have ${userCredits} credits.` 
        });
      }

      // Deduct credits before upscaling
      await storage.deductCredits(userId, upscaleCost);
      
      let upscaledImageUrl: string;
      let cloudinaryPublicId: string | undefined;

      try {
        // Call upscaling service
        const { upscaleImage } = await import("./ai-service");
        const result = await upscaleImage(generation.imageUrl, {
          scale: params.scale,
          faceEnhance: params.faceEnhance
        });

        upscaledImageUrl = result.url;
        cloudinaryPublicId = result.cloudinaryPublicId;

        // Update generation record
        await storage.updateAiGeneration(params.generationId, {
          editedImageUrl: upscaledImageUrl,
          isUpscaled: true,
          creditsUsed: generation.creditsUsed + upscaleCost
        });

        const updatedCredits = await storage.getUserCredits(userId);

        res.json({
          message: "Image upscaled successfully",
          upscaledImageUrl,
          cloudinaryPublicId,
          creditsUsed: upscaleCost,
          creditsRemaining: updatedCredits
        });
      } catch (error) {
        // Refund credits if upscaling failed
        await storage.addCredits(userId, upscaleCost);
        throw error;
      }
    } catch (error) {
      console.error("Error upscaling image:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid parameters", details: error.errors });
      }
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to upscale image" 
      });
    }
  });

  // Save edited AI generation image
  app.post("/api/ai/save-edited", upload.single("image"), authenticateToken, requireApproved, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { generationId } = req.body;

      // Check tier-based edit permission
      const canEdit = await storage.canUserEdit(userId);
      if (!canEdit) {
        return res.status(403).json({ 
          error: "Your subscription tier does not have access to image editing. Please upgrade your plan to use this feature."
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
        return res.status(403).json({ error: "Not authorized to edit this generation" });
      }

      // Upload edited image to Cloudinary
      const uploadResult = await uploadFile(req.file);

      // Update generation record
      await storage.updateAiGeneration(generationId, {
        editedImageUrl: uploadResult.url,
        isEdited: true
      });

      res.json({
        message: "Edited image saved successfully",
        url: uploadResult.url,
        cloudinaryPublicId: uploadResult.cloudinaryPublicId
      });
    } catch (error) {
      console.error("Error saving edited image:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to save edited image" 
      });
    }
  });

  // Proxy download endpoint to bypass CORS issues with external URLs (Replicate, etc.)
  app.get("/api/proxy-download", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { url } = req.query;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "URL parameter is required" });
      }

      console.log("Proxy download request for URL:", url);

      // Fetch the image from external URL
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`Failed to fetch from ${url}: ${response.status} ${response.statusText}`);
        return res.status(response.status).json({ 
          error: `Failed to fetch image: ${response.statusText}` 
        });
      }

      // Get content type and set appropriate headers
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const contentLength = response.headers.get('content-length');
      
      console.log(`Fetched image: ${contentType}, size: ${contentLength || 'unknown'}`);
      
      // Prevent browser caching to avoid 304 Not Modified responses
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', 'attachment');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }

      // Stream the image data to the response
      const buffer = await response.arrayBuffer();
      console.log(`Sending buffer of size: ${buffer.byteLength} bytes`);
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error("Proxy download error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to download image" 
      });
    }
  });

  // ============================================================================
  // SUBSCRIPTION API ENDPOINTS
  // ============================================================================

  // Public Tier Endpoints
  // GET /api/tiers - Get all active tiers (public, no auth required)
  app.get("/api/tiers", async (req, res) => {
    try {
      console.log("Fetching active subscription tiers");
      const tiers = await storage.getSubscriptionTiers(); // Returns only active tiers
      res.json(tiers);
    } catch (error) {
      console.error("Error fetching subscription tiers:", error);
      res.status(500).json({ error: "Failed to fetch subscription tiers" });
    }
  });

  // User Subscription Endpoints (authenticated)
  // GET /api/subscription - Get current user's subscription with tier details
  app.get("/api/subscription", authenticateToken, async (req: AuthRequest, res) => {
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
  });

  // POST /api/subscription/subscribe - Subscribe to a tier
  app.post("/api/subscription/subscribe", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { tierId, paymentMethod } = req.body;

      // Validate input
      if (!tierId || typeof tierId !== 'string') {
        return res.status(400).json({ error: "tierId is required" });
      }

      if (!paymentMethod || !["stripe", "usdc"].includes(paymentMethod)) {
        return res.status(400).json({ error: "paymentMethod must be 'stripe' or 'usdc'" });
      }

      console.log(`User ${userId} subscribing to tier ${tierId} with payment method: ${paymentMethod}`);

      // Check if tier exists
      const tier = await storage.getSubscriptionTier(tierId);
      if (!tier) {
        return res.status(404).json({ error: "Subscription tier not found" });
      }

      if (!tier.isActive) {
        return res.status(400).json({ error: "This subscription tier is not currently available" });
      }

      // Check if user already has an active subscription
      const existingSubscription = await storage.getUserSubscription(userId);
      if (existingSubscription && existingSubscription.status === "active") {
        return res.status(400).json({ error: "You already have an active subscription" });
      }

      // Calculate subscription period (30 days)
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + 30); // 30 days from now

      console.log(`Creating subscription: period start=${now.toISOString()}, period end=${periodEnd.toISOString()}`);

      // Create subscription (without payment processing for now)
      const subscription = await storage.createUserSubscription({
        userId,
        tierId,
        status: "active",
        paymentMethod,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        creditsGranted: 0,
        cancelAtPeriodEnd: false
      });

      console.log(`Subscription created successfully: ${subscription.id}`);

      res.status(201).json(subscription);
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to create subscription" 
      });
    }
  });

  // POST /api/subscription/purchase-crypto - Complete subscription purchase with crypto payment
  const purchaseCryptoSubscriptionSchema = z.object({
    reference: z.string(), // Base58 public key from Solana Pay
    tierId: z.string().uuid(),
    currency: z.enum(["SOL", "USDC"]),
  });

  app.post("/api/subscription/purchase-crypto", authenticateToken, requireApproved, async (req: AuthRequest, res) => {
    try {
      console.log("🔍 [SUBSCRIPTION] Starting crypto subscription purchase:", req.body);
      
      const { reference, tierId, currency } = req.body;
      
      const userId = req.user!.id;
      console.log("👤 [SUBSCRIPTION] User ID:", userId);

      // Get user's connected wallet (optional - for additional verification)
      const userWallet = await storage.getUserWallet(userId);
      if (userWallet) {
        console.log("💼 [SUBSCRIPTION] User wallet found:", userWallet.address);
      } else {
        console.log("ℹ️ [SUBSCRIPTION] No wallet connected for user (will verify via blockchain only):", userId);
      }

      // Get platform wallet address (server-side, not client-controlled!)
      const siteSettings = await storage.getSiteSettings();
      if (!siteSettings || !siteSettings.platformWalletAddress) {
        console.error("❌ [SUBSCRIPTION] Platform wallet not configured!");
        return res.status(500).json({ error: "Platform payment address not configured. Please contact support." });
      }

      const recipientAddress = siteSettings.platformWalletAddress;
      console.log("🏦 [SUBSCRIPTION] Platform wallet:", recipientAddress);

      // Get tier details
      const tier = await storage.getSubscriptionTier(tierId);
      if (!tier) {
        return res.status(404).json({ error: "Subscription tier not found" });
      }

      if (!tier.isActive) {
        return res.status(400).json({ error: "This subscription tier is not currently available" });
      }

      // Convert cents to dollars for USDC verification
      const expectedAmount = tier.priceUsd / 100;
      console.log("💰 [SUBSCRIPTION] Expected amount:", expectedAmount, currency, "(cents:", tier.priceUsd, ")");

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
        if (error.name === 'FindReferenceError' || error.message?.includes('not found')) {
          console.log("⚠️ [SUBSCRIPTION] No transaction found for reference (polling...)");
          return res.json({ found: false, message: "Payment not found yet. Please complete the transaction in your wallet." });
        }
        // Re-throw unexpected errors
        throw error;
      }
      
      if (!signatureInfo || !signatureInfo.signature) {
        console.log("⚠️ [SUBSCRIPTION] No transaction found for reference");
        return res.json({ found: false, message: "Payment not found yet. Please complete the transaction in your wallet." });
      }

      console.log("✅ [SUBSCRIPTION] Transaction found:", signatureInfo.signature);

      const signature = signatureInfo.signature;

      // Check if transaction already processed
      console.log("🔄 [SUBSCRIPTION] Checking if transaction already processed...");
      const existingTx = await storage.getGloryTransactionByHash(signature);
      if (existingTx) {
        console.log("ℹ️ [SUBSCRIPTION] Transaction already processed:", signature);
        return res.json({ 
          found: true, 
          alreadyProcessed: true,
          success: true,
          txHash: signature,
          message: "Payment already verified" 
        });
      }

      // Verify transaction details (use USDC verification for SPL token)
      console.log("🔍 [SUBSCRIPTION] Verifying USDC transaction details...");
      const { verifyUSDCTransaction } = await import('./solana.js');
      const txResult = await verifyUSDCTransaction(signature, recipientAddress);
      console.log("📊 [SUBSCRIPTION] USDC transaction verification result:", txResult);

      if (!txResult.confirmed) {
        console.log("⚠️ [SUBSCRIPTION] Transaction not yet confirmed");
        return res.json({ found: false, message: "Transaction found but not yet confirmed" });
      }

      // Verify payer matches user's connected wallet (if wallet is connected)
      if (userWallet) {
        console.log("👤 [SUBSCRIPTION] Verifying payer:", {
          expected: userWallet.address,
          actual: txResult.from,
          match: txResult.from === userWallet.address
        });
        if (txResult.from !== userWallet.address) {
          console.log("❌ [SUBSCRIPTION] Payer mismatch!");
          return res.status(400).json({ 
            error: `Transaction payer mismatch. Expected ${userWallet.address}, got ${txResult.from}` 
          });
        }
      } else {
        console.log("ℹ️ [SUBSCRIPTION] Skipping payer verification (no connected wallet). Payer from blockchain:", txResult.from);
      }

      // Verify amount (for USDC, amount is in token units, for SOL in SOL)
      console.log("💰 [SUBSCRIPTION] Verifying amount:", {
        expected: expectedAmount,
        actual: txResult.amount,
        sufficient: txResult.amount && txResult.amount >= expectedAmount
      });
      if (!txResult.amount || txResult.amount < expectedAmount) {
        console.log("❌ [SUBSCRIPTION] Insufficient amount!");
        return res.status(400).json({ 
          error: `Insufficient payment amount. Expected ${expectedAmount} ${currency}, received ${txResult.amount || 0} ${currency}` 
        });
      }

      console.log("🎯 [SUBSCRIPTION] Verifying recipient:", {
        expected: recipientAddress,
        actual: txResult.to,
        match: txResult.to === recipientAddress
      });
      if (txResult.to !== recipientAddress) {
        console.log("❌ [SUBSCRIPTION] Recipient mismatch!");
        return res.status(400).json({ 
          error: "Payment recipient address mismatch" 
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

      if (existingSubscription) {
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
          cancelledAt: null
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
          cancelAtPeriodEnd: false
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
          creditsGranted: tier.monthlyCredits
        }
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
        }
      });

      console.log("✅ [SUBSCRIPTION] Subscription purchase completed successfully!", {
        txHash: signature,
        subscriptionId: subscription.id,
        tierName: tier.name,
        creditsGranted: tier.monthlyCredits
      });

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
        message: `Successfully subscribed to ${tier.name} tier! ${tier.monthlyCredits} credits granted.`
      });
    } catch (error) {
      console.error("💥 [SUBSCRIPTION] Subscription purchase failed:", error);
      
      // Handle specific errors
      if (error instanceof Error) {
        console.log("🔍 [SUBSCRIPTION] Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack?.slice(0, 200)
        });
        
        if (error.message.includes("not found")) {
          return res.json({ found: false, message: "Payment not found yet. Please complete the transaction." });
        }
      }
      
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Failed to process subscription purchase" 
      });
    }
  });

  // DELETE /api/subscription/cancel - Cancel subscription at period end
  app.delete("/api/subscription/cancel", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      console.log(`User ${userId} requesting subscription cancellation`);

      // Get user's active subscription
      const subscription = await storage.getUserSubscription(userId);
      
      if (!subscription) {
        return res.status(404).json({ error: "No active subscription found" });
      }

      if (subscription.status !== "active") {
        return res.status(400).json({ error: "Subscription is not active" });
      }

      if (subscription.cancelAtPeriodEnd) {
        return res.status(400).json({ error: "Subscription is already scheduled for cancellation" });
      }

      // Cancel subscription at period end
      await storage.cancelUserSubscription(subscription.id);
      
      console.log(`Subscription ${subscription.id} scheduled for cancellation at period end`);

      res.json({ message: "Subscription will be cancelled at period end" });
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to cancel subscription" 
      });
    }
  });

  // GET /api/subscription/transactions - Get user's payment history
  app.get("/api/subscription/transactions", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      console.log(`Fetching subscription transactions for user: ${userId}`);

      const transactions = await storage.getSubscriptionTransactions({ userId });
      
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching subscription transactions:", error);
      res.status(500).json({ error: "Failed to fetch payment history" });
    }
  });

  // Admin Tier Management (authenticated + admin)
  // GET /api/admin/tiers - Get all tiers including inactive (admin only)
  app.get("/api/admin/tiers", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      console.log("Admin fetching all subscription tiers (including inactive)");
      // Query all tiers directly from database (including inactive)
      const tiers = await db.query.subscriptionTiers.findMany({
        orderBy: [subscriptionTiers.sortOrder]
      });
      res.json(tiers);
    } catch (error) {
      console.error("Error fetching all subscription tiers:", error);
      res.status(500).json({ error: "Failed to fetch subscription tiers" });
    }
  });

  // PUT /api/admin/tiers/:id - Update tier configuration (admin only)
  app.put("/api/admin/tiers/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
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
      const updatedTier = await storage.updateSubscriptionTier(tierId, updates);
      
      if (!updatedTier) {
        return res.status(500).json({ error: "Failed to update tier" });
      }

      console.log(`Tier ${tierId} updated successfully`);

      res.json(updatedTier);
    } catch (error) {
      console.error("Error updating subscription tier:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to update subscription tier" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

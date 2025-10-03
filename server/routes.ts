import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import { storage } from "./storage";
import { authenticateToken, requireAdmin, requireApproved, generateToken, type AuthRequest } from "./middleware/auth";
import { votingRateLimiter } from "./services/rate-limiter";
import { upload, uploadFile } from "./services/file-upload";
import { calculateRewardDistribution } from "./services/reward-distribution";
import { 
  loginSchema, 
  registerSchema, 
  voteSubmissionSchema,
  updateUserStatusSchema,
  updateSubmissionStatusSchema,
  insertContestSchema,
  insertSubmissionSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(cookieParser());

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
    const user = await storage.getUser(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      gloryBalance: user.gloryBalance
    });
  });

  // Contest routes
  app.get("/api/contests", async (req, res) => {
    try {
      const { status } = req.query;
      const contests = await storage.getContests(status ? { status: status as string } : undefined);
      res.json(contests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contests" });
    }
  });

  app.get("/api/contests/:id", async (req, res) => {
    try {
      const contest = await storage.getContest(req.params.id);
      if (!contest) {
        return res.status(404).json({ error: "Contest not found" });
      }

      // Get top 10 submissions for this contest
      const topSubmissions = await storage.getTopSubmissionsByContest(contest.id, 10);
      
      res.json({
        ...contest,
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
      const updatedContest = await storage.updateContest(req.params.id, req.body);
      if (!updatedContest) {
        return res.status(404).json({ error: "Contest not found" });
      }

      // Log admin action
      await storage.createAuditLog({
        actorUserId: req.user!.id,
        action: "UPDATE_CONTEST",
        meta: { contestId: updatedContest.id, updates: req.body }
      });

      res.json(updatedContest);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid input" });
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
      res.status(500).json({ error: "Failed to end contest and distribute rewards" });
    }
  });

  // Submission routes
  app.get("/api/submissions", async (req, res) => {
    try {
      const { contestId, userId, status } = req.query;
      const submissions = await storage.getSubmissions({
        contestId: contestId as string,
        userId: userId as string,
        status: status as string || "approved" // Default to approved for public view
      });

      res.json(submissions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  app.post("/api/submissions", authenticateToken, requireApproved, upload.single("file"), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "File is required" });
      }

      const { contestId, title, description, type } = req.body;
      
      if (!contestId || !title || !type) {
        return res.status(400).json({ error: "Contest ID, title, and type are required" });
      }

      // Check if contest exists and is active
      const contest = await storage.getContest(contestId);
      if (!contest) {
        return res.status(404).json({ error: "Contest not found" });
      }

      if (contest.status !== "active") {
        return res.status(400).json({ error: "Contest is not accepting submissions" });
      }

      // Check if user already submitted to this contest
      const existingSubmissions = await storage.getSubmissions({ contestId, userId: req.user!.id });
      if (existingSubmissions.length > 0) {
        return res.status(400).json({ error: "You have already submitted to this contest" });
      }

      // Upload file
      const uploadResult = await uploadFile(req.file);

      // Create submission
      const submission = await storage.createSubmission({
        userId: req.user!.id,
        contestId,
        type,
        title,
        description: description || "",
        mediaUrl: uploadResult.url,
        thumbnailUrl: uploadResult.thumbnailUrl || null,
        status: "pending" // Requires admin approval
      });

      res.status(201).json(submission);
    } catch (error) {
      console.error("Submission creation error:", error);
      res.status(500).json({ error: "Failed to create submission" });
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

  // Voting routes
  app.post("/api/votes", authenticateToken, requireApproved, async (req: AuthRequest, res) => {
    try {
      const { submissionId } = voteSubmissionSchema.parse(req.body);
      const userId = req.user!.id;

      // Check rate limit (30 votes per hour per user)
      const rateLimitKey = `vote:${userId}`;
      if (!votingRateLimiter.isAllowed(rateLimitKey)) {
        return res.status(429).json({ 
          error: "Rate limit exceeded. Maximum 30 votes per hour.",
          resetTime: votingRateLimiter.getResetTime(rateLimitKey)
        });
      }

      // Check if submission exists
      const submission = await storage.getSubmission(submissionId);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      if (submission.status !== "approved") {
        return res.status(400).json({ error: "Cannot vote on unapproved submission" });
      }

      // Check if user already voted for this submission
      const existingVote = await storage.getVote(userId, submissionId);
      if (existingVote) {
        return res.status(400).json({ error: "You have already voted for this submission" });
      }

      // Check if user is voting for their own submission
      if (submission.userId === userId) {
        return res.status(400).json({ error: "Cannot vote for your own submission" });
      }

      // Create vote
      const vote = await storage.createVote({ userId, submissionId });

      res.status(201).json({ 
        message: "Vote recorded successfully",
        remainingVotes: votingRateLimiter.getRemainingRequests(rateLimitKey)
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid input" });
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

  // Leaderboard route
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const { limit } = req.query;
      const leaderboard = await storage.getLeaderboard(limit ? parseInt(limit as string) : undefined);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  // Glory ledger route
  app.get("/api/glory-ledger", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const transactions = await storage.getGloryTransactions(req.user!.id);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch glory transactions" });
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

  const httpServer = createServer(app);
  return httpServer;
}

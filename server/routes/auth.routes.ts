import type { Express } from "express";
import bcrypt from "bcrypt";
import { storage } from "../storage";
import {
  generateToken,
  type AuthRequest,
} from "../middleware/auth";
import {
  loginSchema,
  registerSchema,
} from "@shared/schema";
import { RateLimiter } from "../services/rate-limiter";

// Rate limiter for authentication endpoints
const authRateLimiter = new RateLimiter(15 * 60 * 1000, 5); // 5 attempts per 15 minutes

export function registerAuthRoutes(app: Express): void {
  // POST /api/auth/register - User registration
  app.post("/api/auth/register", async (req, res) => {
    try {
      // Rate limiting check
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      if (!authRateLimiter.isAllowed(ip)) {
        return res.status(429).json({ 
          error: "Too many registration attempts. Please try again later." 
        });
      }

      const { username, email, password } = registerSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res
          .status(400)
          .json({ error: "User with this email already exists" });
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
        status: "pending", // Requires admin approval
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
            cancelAtPeriodEnd: false,
          });
          console.log(`Assigned Free tier to new user: ${user.id}`);
        } else {
          console.warn(
            "Free tier not found, user created without subscription",
          );
        }
      } catch (error) {
        console.error("Failed to assign Free tier to new user:", error);
        // Continue anyway - user creation succeeded
      }

      res.status(201).json({
        message: "User created successfully. Please wait for admin approval.",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          status: user.status,
        },
      });
    } catch (error) {
      res
        .status(400)
        .json({
          error: error instanceof Error ? error.message : "Invalid input",
        });
    }
  });

  // POST /api/auth/login - User login
  app.post("/api/auth/login", async (req, res) => {
    try {
      // Rate limiting check
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      if (!authRateLimiter.isAllowed(ip)) {
        return res.status(429).json({ 
          error: "Too many login attempts. Please try again later." 
        });
      }

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
        status: user.status,
      });

      // Set httpOnly cookie
      res.cookie("authToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
          gloryBalance: user.gloryBalance,
        },
      });
    } catch (error) {
      res
        .status(400)
        .json({
          error: error instanceof Error ? error.message : "Invalid input",
        });
    }
  });

  // POST /api/auth/logout - User logout
  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("authToken");
    res.json({ message: "Logged out successfully" });
  });
}





import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

// In-memory rate limiting (would use Redis in production)
const voteLimits = new Map<string, { count: number; resetTime: number }>();

const VOTE_LIMIT = 30; // Max votes per hour
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export const rateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.userId) {
    return next(); // Auth middleware will handle this
  }

  try {
    const now = Date.now();
    const windowStart = new Date(now - WINDOW_MS);
    
    // Check database for actual votes in the time window
    const recentVotes = await storage.getUserVotesInTimeWindow(req.userId, windowStart);
    
    if (recentVotes >= VOTE_LIMIT) {
      return res.status(429).json({ 
        error: "Rate limit exceeded. Maximum 30 votes per hour.", 
        code: "RATE_LIMIT_EXCEEDED" 
      });
    }

    next();
  } catch (error) {
    console.error("Rate limiter error:", error);
    // Continue on error to avoid blocking legitimate requests
    next();
  }
};

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
    // Simple in-memory rate limiting
    const now = Date.now();
    const userLimit = voteLimits.get(req.userId);
    
    if (userLimit) {
      if (now < userLimit.resetTime) {
        if (userLimit.count >= VOTE_LIMIT) {
          return res.status(429).json({ 
            error: "Rate limit exceeded. Maximum 30 votes per hour.", 
            code: "RATE_LIMIT_EXCEEDED" 
          });
        }
        userLimit.count++;
      } else {
        // Reset window
        voteLimits.set(req.userId, { count: 1, resetTime: now + WINDOW_MS });
      }
    } else {
      // First vote
      voteLimits.set(req.userId, { count: 1, resetTime: now + WINDOW_MS });
    }

    next();
  } catch (error) {
    console.error("Rate limiter error:", error);
    // Continue on error to avoid blocking legitimate requests
    next();
  }
};

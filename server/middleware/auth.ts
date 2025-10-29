import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

// Require JWT_SECRET or SESSION_SECRET to be set - never use fallback
if (!process.env.JWT_SECRET && !process.env.SESSION_SECRET) {
  throw new Error("CRITICAL: JWT_SECRET or SESSION_SECRET must be set in environment variables");
}

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET!;

export interface AuthRequest extends Request {
  // user and userId are defined in express.d.ts
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.authToken;

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
}

export function requireApproved(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (req.user.status !== "approved") {
    return res.status(403).json({ error: "Account must be approved to perform this action" });
  }

  next();
}

export function authenticateOptional(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.authToken;

  if (!token) {
    // No token provided, user is anonymous
    req.user = undefined;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    // Invalid token, treat as anonymous
    req.user = undefined;
    next();
  }
}

export function generateToken(user: { id: string; email: string; role: string; status: string }) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
}

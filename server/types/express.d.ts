import { User } from "@shared/schema";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: User;
    }
  }
  
  var rateLimitStore: Map<string, number[]> | undefined;
}

export {};


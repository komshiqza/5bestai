// Simple in-memory rate limiter
// In production, this should use Redis for distributed rate limiting

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs = 60 * 60 * 1000, maxRequests = 30) { // 1 hour window, 30 max requests
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry) {
      this.limits.set(key, { count: 1, windowStart: now });
      return true;
    }

    // Check if window has expired
    if (now - entry.windowStart > this.windowMs) {
      this.limits.set(key, { count: 1, windowStart: now });
      return true;
    }

    // Check if limit exceeded
    if (entry.count >= this.maxRequests) {
      return false;
    }

    // Increment count
    entry.count++;
    this.limits.set(key, entry);
    return true;
  }

  getRemainingRequests(key: string): number {
    const entry = this.limits.get(key);
    if (!entry) return this.maxRequests;
    
    const now = Date.now();
    if (now - entry.windowStart > this.windowMs) {
      return this.maxRequests;
    }
    
    return Math.max(0, this.maxRequests - entry.count);
  }

  getResetTime(key: string): number {
    const entry = this.limits.get(key);
    if (!entry) return 0;
    
    return entry.windowStart + this.windowMs;
  }

  private cleanup() {
    const now = Date.now();
    const keysToDelete: string[] = [];
    this.limits.forEach((entry, key) => {
      if (now - entry.windowStart > this.windowMs) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.limits.delete(key));
  }
}

export const votingRateLimiter = new RateLimiter(60 * 60 * 1000, 30); // 30 votes per hour

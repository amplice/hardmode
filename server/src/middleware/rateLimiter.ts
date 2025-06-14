import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index';
import { logger } from '../utils/logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  middleware = (req: Request, res: Response, next: NextFunction): void => {
    const key = this.getKey(req);
    const now = Date.now();
    
    let entry = this.limits.get(key);
    
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 1,
        resetTime: now + this.windowMs,
      };
      this.limits.set(key, entry);
      return next();
    }

    entry.count++;

    if (entry.count > this.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      res.setHeader('X-RateLimit-Limit', this.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

      logger.warn(`Rate limit exceeded for ${key}`, {
        ip: req.ip,
        path: req.path,
        count: entry.count,
      });

      res.status(429).json({
        error: 'Too many requests',
        message: `Please try again in ${retryAfter} seconds`,
        retryAfter,
      });
      return;
    }

    res.setHeader('X-RateLimit-Limit', this.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', (this.maxRequests - entry.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

    next();
  };

  private getKey(req: Request): string {
    // Use IP address as key, fallback to a default if not available
    return req.ip || 'unknown';
  }

  private cleanup(): void {
    const now = Date.now();
    let deleted = 0;

    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
        deleted++;
      }
    }

    if (deleted > 0) {
      logger.debug(`Rate limiter cleanup: removed ${deleted} expired entries`);
    }
  }
}

// Create rate limiter instance
export const rateLimiter = new RateLimiter(
  config.security.rateLimitWindowMs,
  config.security.rateLimitMaxRequests,
).middleware;
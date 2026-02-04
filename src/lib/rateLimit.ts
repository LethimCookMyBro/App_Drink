/**
 * Rate Limiter
 * In-memory rate limiting for API routes
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute
};

/**
 * Check if request should be rate limited
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = defaultConfig,
): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    cleanupExpiredEntries();
  }

  // No existing entry or expired
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.resetTime - now,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(identifier, entry);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetIn: entry.resetTime - now,
  };
}

/**
 * Clean up expired entries from the store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  return "unknown";
}

/**
 * Rate limit configurations for different endpoints
 */
export const rateLimitConfigs = {
  // Standard API endpoints
  standard: { windowMs: 60 * 1000, maxRequests: 60 },

  // Question fetching - more lenient
  questions: { windowMs: 60 * 1000, maxRequests: 100 },

  // Admin actions - stricter
  admin: { windowMs: 60 * 1000, maxRequests: 20 },

  // Authentication - very strict
  auth: { windowMs: 60 * 1000, maxRequests: 10 },

  // Room creation - moderate
  rooms: { windowMs: 60 * 1000, maxRequests: 15 },
};

export default {
  checkRateLimit,
  getClientIP,
  rateLimitConfigs,
};

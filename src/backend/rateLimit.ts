import { createTokenFingerprint } from "@/backend/securityPrimitives";
import { getClientIPFromHeaders } from "@/backend/requestSecurity";

interface RateLimitEntry {
  hits: number[];
}

export interface RateLimitConfig {
  scope: string;
  windowMs: number;
  maxRequests: number;
  keyStrategy?: "ip" | "ip+subject" | "ip+token";
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
} {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const existing = rateLimitStore.get(identifier)?.hits ?? [];
  const activeHits = existing.filter((timestamp) => timestamp > windowStart);

  if (rateLimitStore.size > 10000) {
    cleanupExpiredEntries();
  }

  if (activeHits.length >= config.maxRequests) {
    const resetAt = activeHits[0] + config.windowMs;
    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetAt,
      retryAfter: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    };
  }

  const updatedHits = [...activeHits, now];
  rateLimitStore.set(identifier, { hits: updatedHits });

  const resetAt = updatedHits[0] + config.windowMs;

  return {
    allowed: true,
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - updatedHits.length),
    resetAt,
    retryAfter: Math.max(1, Math.ceil((resetAt - now) / 1000)),
  };
}

function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    entry.hits = entry.hits.filter((timestamp) => timestamp > now - 24 * 60 * 60 * 1000);
    if (entry.hits.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}

export function getClientIP(request: Request): string {
  return getClientIPFromHeaders(request.headers);
}

function getTokenCandidate(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  const matched = cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) =>
      entry.startsWith("admin-token=") ||
      entry.startsWith("auth-token=") ||
      entry.startsWith("next-auth.session-token=") ||
      entry.startsWith("__Secure-next-auth.session-token="),
    );

  return matched?.split("=")[1] ?? null;
}

export function buildRateLimitKey(
  request: Request,
  config: RateLimitConfig,
  subject?: string,
): string {
  const ip = getClientIP(request);
  const baseKey = `${config.scope}:${ip}`;

  if (config.keyStrategy === "ip+subject") {
    return `${baseKey}:${subject || "anonymous"}`;
  }

  if (config.keyStrategy === "ip+token") {
    const token = subject || getTokenCandidate(request);
    const fingerprint = token ? createTokenFingerprint(token) : "anonymous";
    return `${baseKey}:${fingerprint}`;
  }

  return baseKey;
}

export const rateLimitConfigs = {
  global: { scope: "global", windowMs: 60 * 1000, maxRequests: 200, keyStrategy: "ip" } as RateLimitConfig,
  auth: { scope: "auth", windowMs: 60 * 1000, maxRequests: 5, keyStrategy: "ip+subject" } as RateLimitConfig,
  admin: { scope: "admin", windowMs: 60 * 1000, maxRequests: 10, keyStrategy: "ip+token" } as RateLimitConfig,
  questionMutations: { scope: "question-mutations", windowMs: 60 * 1000, maxRequests: 20, keyStrategy: "ip" } as RateLimitConfig,
  roomCreate: { scope: "room-create", windowMs: 10 * 60 * 1000, maxRequests: 10, keyStrategy: "ip" } as RateLimitConfig,
  roomMutation: { scope: "room-mutation", windowMs: 60 * 1000, maxRequests: 30, keyStrategy: "ip" } as RateLimitConfig,
  roomLookup: { scope: "room-lookup", windowMs: 60 * 1000, maxRequests: 60, keyStrategy: "ip" } as RateLimitConfig,
  profile: { scope: "profile", windowMs: 5 * 60 * 1000, maxRequests: 20, keyStrategy: "ip+token" } as RateLimitConfig,
  feedback: { scope: "feedback", windowMs: 10 * 60 * 1000, maxRequests: 6, keyStrategy: "ip" } as RateLimitConfig,
};

const rateLimitModule = {
  buildRateLimitKey,
  checkRateLimit,
  getClientIP,
  rateLimitConfigs,
};

export default rateLimitModule;

import { NextResponse } from "next/server";
import { filterApiResponse } from "@/backend/apiFilter";
import env from "@/backend/env";
import logger from "@/backend/logger";
import {
  buildRateLimitKey,
  checkRateLimit,
  RateLimitConfig,
} from "@/backend/rateLimit";
import {
  getAllowedOrigins,
  getRequestOrigin,
  isUnsafeMethod,
} from "@/backend/requestSecurity";

export function jsonError(
  error: string,
  status = 400,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json(
    filterApiResponse({ error, ...(extra || {}) }),
    { status },
  );
}

export function jsonOk(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(filterApiResponse(data), { status });
}

export function buildSessionCookieOptions(
  maxAge: number,
  path = "/",
  sameSite: "strict" | "lax" = "strict",
) {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite,
    maxAge,
    path,
  } as const;
}

export function enforceRateLimit(
  request: Request,
  config: RateLimitConfig,
  subject?: string,
) {
  const limit = checkRateLimit(buildRateLimitKey(request, config, subject), config);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": limit.retryAfter.toString(),
          "X-RateLimit-Limit": limit.limit.toString(),
          "X-RateLimit-Remaining": limit.remaining.toString(),
          "X-RateLimit-Reset": limit.resetAt.toString(),
        },
      },
    );
  }
  return null;
}

export function enforceSameOrigin(request: Request) {
  if (!isUnsafeMethod(request.method)) {
    return null;
  }

  const requestOrigin = getRequestOrigin(request);
  const allowedOrigins = getAllowedOrigins(request);

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return null;
  }

  if (!requestOrigin && !env.isProduction) {
    return null;
  }

  if (!requestOrigin) {
    return jsonError("Invalid origin", 403);
  }

  return jsonError("Invalid origin", 403);
}

export function mapServerError(
  error: unknown,
  fallbackMessage: string,
) {
  if (error && typeof error === "object" && "code" in error) {
    const code = String(error.code);
    if (code === "P2002") {
      return jsonError("Already exists", 409);
    }
    if (code === "P2025") {
      return jsonError("Not found", 404);
    }
  }

  logger.error("api.route.error", { fallbackMessage });
  return jsonError(fallbackMessage, 500);
}

import { NextResponse } from "next/server";
import { checkRateLimit, getClientIP, RateLimitConfig } from "@/lib/rateLimit";
import {
  getAllowedOrigins,
  getRequestOrigin,
  isUnsafeMethod,
} from "@/lib/requestSecurity";

export function jsonError(
  error: string,
  status = 400,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json({ error, ...(extra || {}) }, { status });
}

export function jsonOk(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, { status });
}

export function enforceRateLimit(request: Request, config: RateLimitConfig) {
  const ip = getClientIP(request);
  const limit = checkRateLimit(ip, config);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(limit.resetIn / 1000).toString(),
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

  if (!requestOrigin && process.env.NODE_ENV !== "production") {
    return null;
  }

  if (!requestOrigin) {
    return jsonError("Invalid origin", 403);
  }

  return jsonError("Invalid origin", 403);
}

import { NextResponse } from "next/server";
import { checkRateLimit, getClientIP, RateLimitConfig } from "@/lib/rateLimit";

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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return null;

  let allowedOrigin: string;
  try {
    allowedOrigin = new URL(appUrl).origin;
  } catch {
    return null;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (origin && origin !== allowedOrigin) {
    return jsonError("Invalid origin", 403);
  }

  if (!origin && referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (refererOrigin !== allowedOrigin) {
        return jsonError("Invalid origin", 403);
      }
    } catch {
      return jsonError("Invalid origin", 403);
    }
  }

  if (!origin && !referer && process.env.NODE_ENV === "production") {
    return jsonError("Invalid origin", 403);
  }

  return null;
}

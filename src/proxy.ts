import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  buildContentSecurityPolicy,
  getAllowedOrigins,
  getClientIPFromHeaders,
  getRequestOrigin,
} from "@/lib/requestSecurity";

// Simple in-memory rate limiter (use Redis in production for distributed systems)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || "100");
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function getRateLimitInfo(ip: string) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { limited: false, remaining: RATE_LIMIT_MAX - 1 };
  }

  record.count++;
  if (record.count > RATE_LIMIT_MAX) {
    return { limited: true, remaining: 0 };
  }

  return { limited: false, remaining: RATE_LIMIT_MAX - record.count };
}

function applySecurityHeaders(
  response: NextResponse,
  request: NextRequest,
): void {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Origin-Agent-Cluster", "?1");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Content-Security-Policy",
      buildContentSecurityPolicy(),
    );
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const requestOrigin = getRequestOrigin(request);
    const allowedOrigins = new Set(getAllowedOrigins(request));

    if (requestOrigin && allowedOrigins.has(requestOrigin)) {
      response.headers.set("Access-Control-Allow-Origin", requestOrigin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
      );
      response.headers.set("Vary", "Origin");
    }
  }
}

export function proxy(request: NextRequest) {
  if (
    request.nextUrl.pathname.startsWith("/api/") &&
    request.method === "OPTIONS"
  ) {
    const preflight = new NextResponse(null, { status: 204 });
    applySecurityHeaders(preflight, request);
    return preflight;
  }

  const response = NextResponse.next();
  const ip = getClientIPFromHeaders(request.headers);

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const { limited, remaining } = getRateLimitInfo(ip);
    response.headers.set("X-RateLimit-Limit", RATE_LIMIT_MAX.toString());
    response.headers.set("X-RateLimit-Remaining", remaining.toString());

    if (limited) {
      const limitedResponse = new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
        },
      );
      applySecurityHeaders(limitedResponse, request);
      return limitedResponse;
    }
  }

  applySecurityHeaders(response, request);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import env from "@/lib/env";
import verifyHs256Jwt from "@/lib/jwtEdge";
import { checkRateLimit, rateLimitConfigs } from "@/lib/rateLimit";
import { getClientIPFromHeaders } from "@/lib/requestSecurity";
import {
  applyCorsHeaders,
  forbiddenCorsResponse,
  handleCorsPreflight,
  isCorsOriginAllowed,
} from "@/lib/withCors";

function getCookieValue(request: NextRequest, name: string): string | null {
  return request.cookies.get(name)?.value ?? null;
}

async function verifyAdminRequest(request: NextRequest) {
  const token = getCookieValue(request, "admin-token");
  if (!token) {
    return { ok: false as const, reason: "invalid" as const };
  }

  return verifyHs256Jwt(token, env.adminJwtSecret);
}

function applyRateLimitHeaders(response: NextResponse, limit: ReturnType<typeof checkRateLimit>) {
  response.headers.set("X-RateLimit-Limit", limit.limit.toString());
  response.headers.set("X-RateLimit-Remaining", limit.remaining.toString());
  response.headers.set("X-RateLimit-Reset", limit.resetAt.toString());
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const preflight = handleCorsPreflight(request, {
      allowCredentials: request.nextUrl.pathname.startsWith("/api/admin/"),
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    });
    if (preflight) {
      return preflight;
    }

    if (request.headers.get("origin") && !isCorsOriginAllowed(request)) {
      return forbiddenCorsResponse();
    }
  }

  if (request.nextUrl.pathname.startsWith("/admin") && !request.nextUrl.pathname.startsWith("/admin/login")) {
    const verification = await verifyAdminRequest(request);
    if (!verification.ok) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("reason", verification.reason);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (request.nextUrl.pathname.startsWith("/api/admin/")) {
    const verification = await verifyAdminRequest(request);
    if (!verification.ok) {
      return NextResponse.json(
        { error: "Unauthorized", reason: verification.reason },
        { status: 401 },
      );
    }
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const isUnlimitedQuestionsRoute =
      request.nextUrl.pathname === "/api/questions/random" &&
      request.method === "GET";

    const ip = getClientIPFromHeaders(request.headers);
    const key = `${rateLimitConfigs.global.scope}:${ip}`;
    const limit = checkRateLimit(key, rateLimitConfigs.global);
    if (!isUnlimitedQuestionsRoute) {
      if (!limit.allowed) {
        const limitedResponse = NextResponse.json(
          { error: "Too many requests. Please try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": limit.retryAfter.toString(),
            },
          },
        );
        applyRateLimitHeaders(limitedResponse, limit);
        return limitedResponse;
      }
    }

    const response = NextResponse.next();
    if (!isUnlimitedQuestionsRoute) {
      applyRateLimitHeaders(response, limit);
    }
    return applyCorsHeaders(request, response, {
      allowCredentials: request.nextUrl.pathname.startsWith("/api/admin/"),
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};

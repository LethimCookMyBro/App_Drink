import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import env from "@/backend/env";
import verifyHs256Jwt from "@/backend/jwtEdge";
import {
  buildRateLimitKey,
  checkRateLimit,
  rateLimitConfigs,
} from "@/backend/rateLimit";
import {
  applyCorsHeaders,
  forbiddenCorsResponse,
  handleCorsPreflight,
  isCorsOriginAllowed,
} from "@/backend/withCors";

function getCookieValue(request: NextRequest, name: string): string | null {
  return request.cookies.get(name)?.value ?? null;
}

function ensureRateLimitCookie(request: NextRequest, response: NextResponse) {
  if (request.cookies.get("wongtaek-rate-id")) {
    return response;
  }

  response.cookies.set(
    "wongtaek-rate-id",
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    {
      httpOnly: true,
      sameSite: "lax",
      secure: env.isProduction,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    },
  );

  return response;
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

function applySecurityHeaders(response: NextResponse, isApi = false) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  if (env.isProduction) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  if (isApi) {
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private, max-age=0",
    );
    response.headers.set("Pragma", "no-cache");
  }

  return response;
}

export async function proxy(request: NextRequest) {
  const isAdminLoginPage = request.nextUrl.pathname === "/admin/login";
  const isAdminLoginApi = request.nextUrl.pathname === "/api/admin/login";
  const isAdminVerifyApi = request.nextUrl.pathname === "/api/admin/verify";
  const isPublicAdminAuthApi = isAdminLoginApi || isAdminVerifyApi;

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const preflight = handleCorsPreflight(request, {
      allowCredentials: request.nextUrl.pathname.startsWith("/api/admin/"),
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    });
    if (preflight) {
      return applySecurityHeaders(preflight, true);
    }

    if (request.headers.get("origin") && !isCorsOriginAllowed(request)) {
      return applySecurityHeaders(forbiddenCorsResponse(), true);
    }
  }

  if (request.nextUrl.pathname.startsWith("/admin") && !isAdminLoginPage) {
    const verification = await verifyAdminRequest(request);
    if (!verification.ok) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("reason", verification.reason);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (request.nextUrl.pathname.startsWith("/api/admin/") && !isPublicAdminAuthApi) {
    const verification = await verifyAdminRequest(request);
    if (!verification.ok) {
      return applySecurityHeaders(
        NextResponse.json(
        { error: "Unauthorized", reason: verification.reason },
        { status: 401 },
        ),
        true,
      );
    }
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const key = buildRateLimitKey(request, rateLimitConfigs.global);
    const limit = checkRateLimit(key, rateLimitConfigs.global);
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
      return applySecurityHeaders(
        ensureRateLimitCookie(request, limitedResponse),
        true,
      );
    }

    const response = NextResponse.next();
    applyRateLimitHeaders(response, limit);
    return applySecurityHeaders(
      applyCorsHeaders(request, ensureRateLimitCookie(request, response), {
      allowCredentials: request.nextUrl.pathname.startsWith("/api/admin/"),
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      }),
      true,
    );
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};

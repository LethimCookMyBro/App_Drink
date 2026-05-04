import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildContentSecurityPolicy } from "@/backend/contentSecurityPolicy";
import env from "@/backend/env";
import verifyHs256Jwt from "@/backend/jwtEdge";
import {
  buildRateLimitKey,
  checkRateLimit,
  getGlobalRateLimitConfig,
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

function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

function createRequestHeadersWithNonce(request: NextRequest, csp: string, nonce: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  return requestHeaders;
}

function applySecurityHeaders(response: NextResponse, csp: string, isApi = false) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Content-Security-Policy", csp);
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
  const nonce = createNonce();
  const csp = buildContentSecurityPolicy({
    admin: request.nextUrl.pathname.startsWith("/admin"),
    isDevelopment: env.isDevelopment,
    nonce,
  });
  const requestHeaders = createRequestHeadersWithNonce(request, csp, nonce);
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
      return applySecurityHeaders(preflight, csp, true);
    }

    if (request.headers.get("origin") && !isCorsOriginAllowed(request)) {
      return applySecurityHeaders(forbiddenCorsResponse(), csp, true);
    }
  }

  if (request.nextUrl.pathname.startsWith("/admin") && !isAdminLoginPage) {
    const verification = await verifyAdminRequest(request);
    if (!verification.ok) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("reason", verification.reason);
      return applySecurityHeaders(NextResponse.redirect(loginUrl), csp);
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
        csp,
        true,
      );
    }
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const globalRateLimitConfig = getGlobalRateLimitConfig(request);
    const key = buildRateLimitKey(request, globalRateLimitConfig);
    const limit = checkRateLimit(key, globalRateLimitConfig);
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
      return applySecurityHeaders(limitedResponse, csp, true);
    }

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    applyRateLimitHeaders(response, limit);
    return applySecurityHeaders(
      applyCorsHeaders(request, response, {
        allowCredentials: request.nextUrl.pathname.startsWith("/api/admin/"),
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      }),
      csp,
      true,
    );
  }

  return applySecurityHeaders(
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    }),
    csp,
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};

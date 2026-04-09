import env from "@/lib/env";
import { buildContentSecurityPolicy as buildSharedContentSecurityPolicy } from "@/lib/contentSecurityPolicy";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const FORWARDED_IP_HEADERS = [
  "cf-connecting-ip",
  "true-client-ip",
  "x-forwarded-for",
  "x-real-ip",
] as const;
const IPV4_PATTERN =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPV6_PATTERN = /^[a-f0-9:]+$/i;

function parseOrigin(value: string | null): string | null {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function normalizeIp(rawValue: string | null): string | null {
  if (!rawValue) return null;

  const firstValue = rawValue.split(",")[0]?.trim();
  if (!firstValue) return null;

  const normalized = firstValue.replace(/^\[|\]$/g, "");

  if (IPV4_PATTERN.test(normalized) || IPV6_PATTERN.test(normalized)) {
    return normalized;
  }

  return null;
}

export function getClientIPFromHeaders(headers: Headers): string {
  for (const header of FORWARDED_IP_HEADERS) {
    const candidate = normalizeIp(headers.get(header));
    if (candidate) {
      return candidate;
    }
  }

  return "unknown";
}

export function getRequestOrigin(request: Pick<Request, "headers">): string | null {
  const origin = parseOrigin(request.headers.get("origin"));
  if (origin) return origin;

  return parseOrigin(request.headers.get("referer"));
}

export function getAllowedOrigins(
  request: Pick<Request, "headers" | "url">,
): string[] {
  const origins = new Set<string>();

  const appUrl = env.appUrl;
  if (appUrl) {
    origins.add(appUrl);
  }

  for (const origin of env.allowedOrigins) {
    origins.add(origin);
  }

  try {
    origins.add(new URL(request.url).origin);
  } catch {
    // Ignore malformed request URLs and fall back to forwarded headers only.
  }

  const forwardedHost =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (forwardedHost) {
    const proto =
      request.headers.get("x-forwarded-proto") ??
      (() => {
        try {
          return new URL(request.url).protocol.replace(":", "");
        } catch {
          return env.isProduction ? "https" : "http";
        }
      })();

    const host = forwardedHost.split(",")[0]?.trim();
    if (host) {
      const derivedOrigin = parseOrigin(`${proto}://${host}`);
      if (derivedOrigin) {
        origins.add(derivedOrigin);
      }
    }
  }

  return [...origins];
}

export function isUnsafeMethod(method: string): boolean {
  return !SAFE_METHODS.has(method.toUpperCase());
}

export function buildContentSecurityPolicy(options?: { admin?: boolean }): string {
  return buildSharedContentSecurityPolicy({
    admin: options?.admin,
    isDevelopment: env.isDevelopment,
  });
}

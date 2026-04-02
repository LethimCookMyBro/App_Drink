const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const FORWARDED_IP_HEADERS = [
  "cf-connecting-ip",
  "true-client-ip",
  "x-forwarded-for",
  "x-real-ip",
] as const;

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

  return firstValue.replace(/^\[|\]$/g, "");
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

  const appUrl = parseOrigin(process.env.NEXT_PUBLIC_APP_URL ?? null);
  if (appUrl) {
    origins.add(appUrl);
  }

  for (const entry of (process.env.ALLOWED_ORIGINS ?? "").split(",")) {
    const origin = parseOrigin(entry.trim());
    if (origin) {
      origins.add(origin);
    }
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
          return process.env.NODE_ENV === "production" ? "https" : "http";
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

export function buildContentSecurityPolicy(): string {
  const scriptSources =
    process.env.NODE_ENV === "development"
      ? "'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com"
      : "'self' 'unsafe-inline' https://challenges.cloudflare.com";

  return [
    "default-src 'self'",
    `script-src ${scriptSources}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://challenges.cloudflare.com",
    "frame-src 'self' https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

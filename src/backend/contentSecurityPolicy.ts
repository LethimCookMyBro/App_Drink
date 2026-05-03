export interface ContentSecurityPolicyOptions {
  admin?: boolean;
  isDevelopment?: boolean;
  nonce?: string | null;
}

const TURNSTILE_CHALLENGE_ORIGIN = "https://challenges.cloudflare.com";
const TURNSTILE_INLINE_SCRIPT_HASH =
  "'sha256-eJGI0Ik4oYe/PKLDOt4wcN76wYs8h+Ew05pMzdY6xG8='";

export function buildContentSecurityPolicy(
  options: ContentSecurityPolicyOptions = {},
): string {
  const isAdmin = options.admin === true;
  const isDevelopment =
    options.isDevelopment ?? process.env.NODE_ENV !== "production";
  const nonce = options.nonce ? `'nonce-${options.nonce}'` : null;
  const scriptSources = isDevelopment
    ? [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        TURNSTILE_CHALLENGE_ORIGIN,
      ].join(" ")
    : ["'self'", nonce, TURNSTILE_INLINE_SCRIPT_HASH, TURNSTILE_CHALLENGE_ORIGIN]
        .filter(Boolean)
        .join(" ");
  const frameSources = isAdmin
    ? TURNSTILE_CHALLENGE_ORIGIN
    : ["'self'", TURNSTILE_CHALLENGE_ORIGIN].join(" ");
  const directives = [
    "default-src 'self'",
    `script-src ${scriptSources}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    `connect-src 'self' ${TURNSTILE_CHALLENGE_ORIGIN}`,
    `frame-src ${frameSources}`,
    `child-src ${frameSources}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ];

  if (!isDevelopment) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

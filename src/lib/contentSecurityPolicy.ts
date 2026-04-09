export interface ContentSecurityPolicyOptions {
  admin?: boolean;
  isDevelopment?: boolean;
}

const CLOUDFLARE_CHALLENGE_ORIGIN = "https://challenges.cloudflare.com";

export function buildContentSecurityPolicy(
  options: ContentSecurityPolicyOptions = {},
): string {
  const isAdmin = options.admin === true;
  const isDevelopment =
    options.isDevelopment ?? process.env.NODE_ENV !== "production";
  const scriptSources = isDevelopment
    ? `'self' 'unsafe-inline' 'unsafe-eval' ${CLOUDFLARE_CHALLENGE_ORIGIN}`
    : `'self' 'unsafe-inline' ${CLOUDFLARE_CHALLENGE_ORIGIN}`;
  const frameSources = isAdmin
    ? CLOUDFLARE_CHALLENGE_ORIGIN
    : `'self' ${CLOUDFLARE_CHALLENGE_ORIGIN}`;
  const directives = [
    "default-src 'self'",
    `script-src ${scriptSources}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    `connect-src 'self' ${CLOUDFLARE_CHALLENGE_ORIGIN}`,
    `frame-src ${frameSources}`,
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

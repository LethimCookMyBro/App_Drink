import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const sharedHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const generalCsp =
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src 'self' https://fonts.gstatic.com; " +
  "img-src 'self' data: blob:; " +
  "connect-src 'self' https://challenges.cloudflare.com; " +
  "frame-src https://challenges.cloudflare.com; " +
  "object-src 'none'; " +
  "base-uri 'self'; " +
  "form-action 'self'";

const adminCsp = generalCsp;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          ...sharedHeaders.filter((header) => isProd || header.key !== "Strict-Transport-Security"),
          { key: "Content-Security-Policy", value: generalCsp },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          ...sharedHeaders.filter((header) => isProd || header.key !== "Strict-Transport-Security"),
          { key: "Content-Security-Policy", value: adminCsp },
        ],
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";
import { buildContentSecurityPolicy } from "./src/lib/contentSecurityPolicy";

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

const generalCsp = buildContentSecurityPolicy({ isDevelopment: !isProd });
const adminCsp = buildContentSecurityPolicy({
  admin: true,
  isDevelopment: !isProd,
});

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

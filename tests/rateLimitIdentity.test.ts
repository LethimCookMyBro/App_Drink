import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRateLimitKey,
  getClientIP,
  getGlobalRateLimitConfig,
  getTrustedClientIP,
  rateLimitConfigs,
} from "../src/backend/rateLimit";
import {
  getClientIPFromHeaders,
  getTrustedClientIPFromHeaders,
} from "../src/backend/requestSecurity";

test("does not trust forwarded IP headers by default", () => {
  const headers = new Headers({
    "cf-connecting-ip": "203.0.113.10",
    "x-forwarded-for": "198.51.100.1, 10.0.0.1",
    "x-real-ip": "192.0.2.20",
  });

  assert.equal(getTrustedClientIPFromHeaders(headers), null);
  assert.equal(getClientIPFromHeaders(headers), "unknown");
});

test("uses trusted proxy headers only when explicitly enabled", () => {
  const headers = new Headers({
    "cf-connecting-ip": "203.0.113.10",
  });

  assert.equal(
    getTrustedClientIPFromHeaders(headers, { trustProxyHeaders: true }),
    "203.0.113.10",
  );
});

test("unidentified requests share a stricter bucket independent of mutable headers", () => {
  const firstRequest = new Request("https://example.test/api/questions/random", {
    headers: {
      "user-agent": "node-test-agent",
      "accept-language": "th-TH",
      "sec-ch-ua": '"Chromium";v="136"',
      cookie: "wongtaek-rate-id=first; auth-token=first-token",
      "x-forwarded-for": "198.51.100.50",
    },
  });
  const secondRequest = new Request("https://example.test/api/questions/random", {
    headers: {
      "user-agent": "rotated-agent",
      "accept-language": "en-US",
      "sec-ch-ua": '"Other";v="1"',
      cookie: "wongtaek-rate-id=second; auth-token=second-token",
      "x-forwarded-for": "203.0.113.77",
    },
  });

  assert.equal(getTrustedClientIP(firstRequest), null);
  assert.equal(getClientIP(firstRequest), "untrusted:global");
  assert.equal(getClientIP(secondRequest), "untrusted:global");
  assert.equal(
    getGlobalRateLimitConfig(firstRequest),
    rateLimitConfigs.unidentifiedGlobal,
  );
  assert.equal(
    buildRateLimitKey(firstRequest, rateLimitConfigs.global),
    buildRateLimitKey(secondRequest, rateLimitConfigs.global),
  );
  assert.equal(
    buildRateLimitKey(firstRequest, rateLimitConfigs.auth, "alice@example.com"),
    buildRateLimitKey(secondRequest, rateLimitConfigs.auth, "bob@example.com"),
  );
});

test("room joins have a dedicated enumeration limiter", () => {
  assert.equal(rateLimitConfigs.roomJoin.scope, "room-join");
  assert.ok(
    rateLimitConfigs.roomJoin.maxRequests < rateLimitConfigs.roomMutation.maxRequests,
  );
});

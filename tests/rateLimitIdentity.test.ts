import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRateLimitKey,
  getClientIP,
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

test("rate-limit identity does not collapse to shared unknown bucket", () => {
  const request = new Request("https://example.test/api/questions/random", {
    headers: {
      "user-agent": "node-test-agent",
      "accept-language": "th-TH",
      "x-forwarded-for": "198.51.100.50",
    },
  });

  assert.equal(getTrustedClientIP(request), null);
  assert.match(getClientIP(request), /^untrusted:/);
  assert.notEqual(
    buildRateLimitKey(request, rateLimitConfigs.global),
    "global:unknown",
  );
});

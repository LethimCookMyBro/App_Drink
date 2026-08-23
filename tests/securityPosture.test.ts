import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSecurityPosture,
  type SecurityPostureInput,
} from "../src/backend/securityPosture";

function makeInput(overrides: Partial<SecurityPostureInput> = {}): SecurityPostureInput {
  return {
    turnstileConfigured: true,
    googleLoginEnabled: false,
    googleSheetsEnabled: true,
    allowedOriginsCount: 1,
    allowedOriginsPreview: "https://example.com",
    isProduction: true,
    trustProxyIpHeaders: false,
    ...overrides,
  };
}

function findItem(
  posture: ReturnType<typeof buildSecurityPosture>,
  label: string,
) {
  for (const group of posture) {
    const item = group.items.find((entry) => entry.label === label);
    if (item) return item;
  }
  throw new Error(`posture item not found: ${label}`);
}

test("production runtime marks secrets policy as verified", () => {
  const secrets = findItem(buildSecurityPosture(makeInput()), "Secrets Policy");
  assert.equal(secrets.checked, true);
  assert.equal(secrets.tone, "good");
});

test("non-production runtime never claims secrets are verified healthy", () => {
  const secrets = findItem(
    buildSecurityPosture(makeInput({ isProduction: false })),
    "Secrets Policy",
  );
  assert.equal(secrets.checked, false);
  assert.notEqual(secrets.tone, "good");
});

test("cookie policy reflects the production secure flag honestly", () => {
  const prod = findItem(
    buildSecurityPosture(makeInput({ isProduction: true })),
    "Session Cookies",
  ).value;
  const dev = findItem(
    buildSecurityPosture(makeInput({ isProduction: false })),
    "Session Cookies",
  ).value;

  assert.match(prod, /Secure/);
  assert.doesNotMatch(dev, /Secure(?!.*dev)/);
});

test("cookie policy is never marked as runtime-verified", () => {
  // The admin UI must not show a green checkmark for cookie policy based
  // solely on env flags — we never read the actual Set-Cookie header at
  // startup, so a runtime-verified claim would be false.
  for (const isProduction of [true, false]) {
    const cookies = findItem(
      buildSecurityPosture(makeInput({ isProduction })),
      "Session Cookies",
    );
    assert.equal(cookies.checked, false);
  }
});

test("cookie policy mentions both SameSite modes used in the codebase", () => {
  // The app uses `SameSite=Strict` for app/room/admin cookies but
  // `SameSite=Lax` for NextAuth session cookies (see clearNextAuthSessionCookies
  // and NextAuth's v4 default). The posture entry must not pretend it is
  // uniformly Strict.
  const cookies = findItem(
    buildSecurityPosture(makeInput()),
    "Session Cookies",
  );
  assert.match(cookies.value, /Strict/);
  assert.match(cookies.value, /Lax/);
});

test("cookie policy still reports HttpOnly", () => {
  const cookies = findItem(
    buildSecurityPosture(makeInput()),
    "Session Cookies",
  );
  assert.match(cookies.value, /HttpOnly/);
});

test("turnstile reports unconfigured as warning, never healthy", () => {
  const turnstile = findItem(
    buildSecurityPosture(makeInput({ turnstileConfigured: false })),
    "Turnstile",
  );
  assert.equal(turnstile.checked, true);
  assert.equal(turnstile.tone, "warn");
});

test("groups cover auth, web and integrations", () => {
  const posture = buildSecurityPosture(makeInput());
  assert.deepEqual(
    posture.map((group) => group.group),
    ["auth", "web", "integrations"],
  );
});

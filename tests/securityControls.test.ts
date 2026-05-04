import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import {
  getAdminJwtSecret,
  verifyAdminToken,
} from "../src/backend/adminAuth";
import { buildContentSecurityPolicy } from "../src/backend/contentSecurityPolicy";
import { validateProductionSecuritySecrets } from "../src/backend/env";
import { roomCodeSchema } from "../src/shared/schemas";

const strongSecrets = {
  JWT_SECRET: "a".repeat(32),
  ADMIN_JWT_SECRET: "b".repeat(32),
  ROOM_JWT_SECRET: "c".repeat(32),
  NEXTAUTH_SECRET: "d".repeat(32),
  API_ENCRYPTION_KEY: "e".repeat(32),
};

function getCspDirective(csp: string, name: string): string | undefined {
  return csp
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name} `));
}

test("production security secrets must be present, long, and distinct", () => {
  assert.doesNotThrow(() => validateProductionSecuritySecrets(strongSecrets));
  assert.throws(
    () =>
      validateProductionSecuritySecrets({
        ...strongSecrets,
        NEXTAUTH_SECRET: undefined,
      }),
    /NEXTAUTH_SECRET must be set/,
  );
  assert.throws(
    () =>
      validateProductionSecuritySecrets({
        ...strongSecrets,
        API_ENCRYPTION_KEY: "short",
      }),
    /API_ENCRYPTION_KEY must be set/,
  );
  assert.throws(
    () =>
      validateProductionSecuritySecrets({
        ...strongSecrets,
        API_ENCRYPTION_KEY: strongSecrets.JWT_SECRET,
      }),
    /must all be different/,
  );
});

test("admin JWT verification rejects non-HS256 tokens", () => {
  const hs384Token = jwt.sign(
    { adminId: "admin_1", role: "ADMIN" },
    getAdminJwtSecret(),
    { algorithm: "HS384", expiresIn: "2h" },
  );

  assert.equal(verifyAdminToken(hs384Token), null);
});

test("production script CSP uses nonce without unsafe-inline", () => {
  const csp = buildContentSecurityPolicy({
    isDevelopment: false,
    nonce: "abc123",
  });
  const scriptDirective = getCspDirective(csp, "script-src");

  assert.ok(scriptDirective);
  assert.match(scriptDirective, /'nonce-abc123'/);
  assert.match(scriptDirective, /https:\/\/challenges\.cloudflare\.com/);
  assert.doesNotMatch(scriptDirective, /'unsafe-inline'/);
});

test(
  "production admin CSP allows Turnstile frames without app Trusted Types enforcement",
  () => {
    const csp = buildContentSecurityPolicy({
      admin: true,
      isDevelopment: false,
      nonce: "abc123",
    });
    const frameDirective = getCspDirective(csp, "frame-src");
    const childDirective = getCspDirective(csp, "child-src");

    assert.equal(frameDirective, "frame-src https://challenges.cloudflare.com");
    assert.equal(childDirective, "child-src https://challenges.cloudflare.com");
    assert.equal(getCspDirective(csp, "trusted-types"), undefined);
    assert.equal(getCspDirective(csp, "require-trusted-types-for"), undefined);
  },
);

test("room code schema requires 8 alphanumeric characters", () => {
  assert.equal(roomCodeSchema.safeParse("ABCD").success, false);
  assert.equal(roomCodeSchema.parse("abcd2345"), "ABCD2345");
});

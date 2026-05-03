import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import {
  getAdminJwtSecret,
  verifyAdminToken,
} from "../src/backend/adminAuth";
import { buildContentSecurityPolicy } from "../src/backend/contentSecurityPolicy";
import { validateProductionSecuritySecrets } from "../src/backend/env";

const strongSecrets = {
  JWT_SECRET: "a".repeat(32),
  ADMIN_JWT_SECRET: "b".repeat(32),
  ROOM_JWT_SECRET: "c".repeat(32),
  NEXTAUTH_SECRET: "d".repeat(32),
  API_ENCRYPTION_KEY: "e".repeat(32),
};

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
  const scriptDirective = csp
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("script-src"));

  assert.ok(scriptDirective);
  assert.match(scriptDirective, /'nonce-abc123'/);
  assert.doesNotMatch(scriptDirective, /'unsafe-inline'/);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_SEED_DEFAULT_CREDENTIALS_ERROR,
  validateAdminSeedEnvironment,
} from "../prisma/seedValidation";

test("admin seed rejects .env.example default credentials outside tests", () => {
  assert.throws(
    () =>
      validateAdminSeedEnvironment({
        NODE_ENV: "production",
        ADMIN_SEED_USERNAME: "admin",
        ADMIN_SEED_EMAIL: "owner@example.com",
        ADMIN_SEED_PASSWORD: "strong-password",
      }),
    { message: ADMIN_SEED_DEFAULT_CREDENTIALS_ERROR },
  );

  assert.throws(
    () =>
      validateAdminSeedEnvironment({
        NODE_ENV: "production",
        ADMIN_SEED_USERNAME: "owner",
        ADMIN_SEED_EMAIL: "admin@example.com",
        ADMIN_SEED_PASSWORD: "strong-password",
      }),
    { message: ADMIN_SEED_DEFAULT_CREDENTIALS_ERROR },
  );

  assert.throws(
    () =>
      validateAdminSeedEnvironment({
        NODE_ENV: "production",
        ADMIN_SEED_USERNAME: "owner",
        ADMIN_SEED_EMAIL: "owner@example.com",
        ADMIN_SEED_PASSWORD: "change-me-please",
      }),
    { message: ADMIN_SEED_DEFAULT_CREDENTIALS_ERROR },
  );
});

test("admin seed rejects short passwords outside tests", () => {
  assert.throws(
    () =>
      validateAdminSeedEnvironment({
        NODE_ENV: "production",
        ADMIN_SEED_USERNAME: "owner",
        ADMIN_SEED_EMAIL: "owner@example.com",
        ADMIN_SEED_PASSWORD: "short",
      }),
    /at least 12 characters/,
  );
});

test("admin seed validation allows test env and real production credentials", () => {
  assert.doesNotThrow(() =>
    validateAdminSeedEnvironment({
      NODE_ENV: "test",
      ADMIN_SEED_USERNAME: "admin",
      ADMIN_SEED_EMAIL: "admin@example.com",
      ADMIN_SEED_PASSWORD: "change-me-please",
    }),
  );

  assert.doesNotThrow(() =>
    validateAdminSeedEnvironment({
      NODE_ENV: "production",
      ADMIN_SEED_USERNAME: "owner",
      ADMIN_SEED_EMAIL: "owner@example.com",
      ADMIN_SEED_PASSWORD: "very-strong-password",
    }),
  );
});

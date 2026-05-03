import assert from "node:assert/strict";
import test from "node:test";
import { mapTurnstileVerificationFailure } from "../src/backend/integrations/cloudflareTurnstile";

test("maps invalid Turnstile secret as a configuration error", () => {
  const result = mapTurnstileVerificationFailure(["invalid-input-secret"], 400);

  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
  assert.match(result.error ?? "", /ตั้งค่าไม่ถูกต้อง/);
});

test("maps invalid Turnstile token as a retryable verification failure", () => {
  const result = mapTurnstileVerificationFailure(["invalid-input-response"], 200);

  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.match(result.error ?? "", /ไม่ผ่าน/);
});

test("keeps Turnstile server errors as temporary outages", () => {
  const result = mapTurnstileVerificationFailure([], 503);

  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
  assert.match(result.error ?? "", /ไม่พร้อมใช้งานชั่วคราว/);
});

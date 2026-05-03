import { getTrustedClientIP } from "@/backend/rateLimit";
import env from "@/backend/env";
import logger from "@/backend/logger";
import {
  TURNSTILE_SITE_VERIFY_URL,
  type TurnstileAction,
  type TurnstileSiteVerifyResponse,
} from "@/shared/integrations/cloudflareTurnstile";

export interface TurnstileVerificationResult {
  ok: boolean;
  error?: string;
  status?: number;
}

const TURNSTILE_CONFIG_ERROR_CODES = new Set([
  "missing-input-secret",
  "invalid-input-secret",
]);

const TURNSTILE_EXPIRED_TOKEN_ERROR_CODES = new Set(["timeout-or-duplicate"]);

function getTurnstileErrorCodes(
  data: TurnstileSiteVerifyResponse | null,
): string[] {
  return Array.isArray(data?.["error-codes"]) ? data["error-codes"] : [];
}

export function mapTurnstileVerificationFailure(
  errorCodes: readonly string[],
  responseStatus?: number,
): TurnstileVerificationResult {
  if (errorCodes.some((code) => TURNSTILE_CONFIG_ERROR_CODES.has(code))) {
    return {
      ok: false,
      error: "ระบบตรวจสอบความปลอดภัยตั้งค่าไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ",
      status: 503,
    };
  }

  if (errorCodes.some((code) => TURNSTILE_EXPIRED_TOKEN_ERROR_CODES.has(code))) {
    return {
      ok: false,
      error: "การยืนยันความปลอดภัยหมดอายุ กรุณาลองใหม่อีกครั้ง",
      status: 400,
    };
  }

  if (responseStatus && responseStatus >= 500) {
    return {
      ok: false,
      error: "ระบบตรวจสอบความปลอดภัยไม่พร้อมใช้งานชั่วคราว",
      status: 503,
    };
  }

  return {
    ok: false,
    error: "การยืนยันความปลอดภัยไม่ผ่าน กรุณาลองใหม่อีกครั้ง",
    status: 400,
  };
}

export function isTurnstileConfigured(): boolean {
  return Boolean(env.turnstileSiteKey && env.turnstileSecretKey);
}

function buildExpectedHosts(request: Request): Set<string> {
  const hosts = new Set<string>();

  try {
    hosts.add(new URL(request.url).hostname);
  } catch {
    // Ignore malformed request URLs.
  }

  if (env.appUrl) {
    try {
      hosts.add(new URL(env.appUrl).hostname);
    } catch {
      // Ignore malformed app URL config.
    }
  }

  return hosts;
}

export async function verifyTurnstileToken(
  request: Request,
  token: unknown,
  expectedAction?: TurnstileAction,
): Promise<TurnstileVerificationResult> {
  if (!isTurnstileConfigured()) {
    return { ok: true };
  }

  if (typeof token !== "string" || token.trim().length === 0) {
    return {
      ok: false,
      error: "กรุณายืนยันว่าไม่ใช่บอทก่อนส่งข้อมูล",
      status: 400,
    };
  }

  const secret = env.turnstileSecretKey;
  if (!secret) {
    return {
      ok: false,
      error: "ระบบยืนยันตัวตนยังตั้งค่าไม่สมบูรณ์",
      status: 503,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const body = new URLSearchParams({
      secret,
      response: token.trim(),
    });

    const clientIP = getTrustedClientIP(request);
    if (clientIP) {
      body.set("remoteip", clientIP);
    }

    const response = await fetch(TURNSTILE_SITE_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
      signal: controller.signal,
    });

    const data =
      (await response.json().catch(() => null)) as TurnstileSiteVerifyResponse | null;
    const errorCodes = getTurnstileErrorCodes(data);

    if (!response.ok) {
      logger.warn("turnstile.verify.failed", {
        status: response.status,
        errorCodes,
      });
      return mapTurnstileVerificationFailure(errorCodes, response.status);
    }

    if (!data?.success) {
      return mapTurnstileVerificationFailure(errorCodes, response.status);
    }

    if (expectedAction && data.action && data.action !== expectedAction) {
      logger.warn("turnstile.verify.unexpected_action", { action: data.action });
      return {
        ok: false,
        error: "การยืนยันความปลอดภัยไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง",
        status: 400,
      };
    }

    if (data.hostname) {
      const expectedHosts = buildExpectedHosts(request);
      if (expectedHosts.size > 0 && !expectedHosts.has(data.hostname)) {
        logger.warn("turnstile.verify.unexpected_hostname", {
          hostname: data.hostname,
        });
        return {
          ok: false,
          error: "การยืนยันความปลอดภัยไม่ถูกต้อง กรุณารีเฟรชแล้วลองใหม่",
          status: 400,
        };
      }
    }

    return { ok: true };
  } catch (error) {
    logger.error("turnstile.verify.error", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return {
      ok: false,
      error: "ระบบตรวจสอบความปลอดภัยไม่พร้อมใช้งานชั่วคราว",
      status: 503,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

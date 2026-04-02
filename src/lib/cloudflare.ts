import { getClientIP } from "@/lib/rateLimit";

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface TurnstileSiteVerifyResponse {
  success: boolean;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
}

export interface TurnstileVerificationResult {
  ok: boolean;
  error?: string;
  status?: number;
}

export function isTurnstileConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
      process.env.TURNSTILE_SECRET_KEY,
  );
}

function buildExpectedHosts(request: Request): Set<string> {
  const hosts = new Set<string>();

  try {
    hosts.add(new URL(request.url).hostname);
  } catch {
    // Ignore malformed request URLs.
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      hosts.add(new URL(process.env.NEXT_PUBLIC_APP_URL).hostname);
    } catch {
      // Ignore malformed app URL config.
    }
  }

  return hosts;
}

export async function verifyTurnstileToken(
  request: Request,
  token: unknown,
  expectedAction?: string,
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

  const secret = process.env.TURNSTILE_SECRET_KEY;
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

    const clientIP = getClientIP(request);
    if (clientIP !== "unknown") {
      body.set("remoteip", clientIP);
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error("Turnstile verification failed:", response.status);
      return {
        ok: false,
        error: "ระบบตรวจสอบความปลอดภัยไม่พร้อมใช้งานชั่วคราว",
        status: 503,
      };
    }

    const data =
      (await response.json()) as TurnstileSiteVerifyResponse;

    if (!data.success) {
      return {
        ok: false,
        error: "การยืนยันความปลอดภัยไม่ผ่าน กรุณาลองใหม่อีกครั้ง",
        status: 400,
      };
    }

    if (expectedAction && data.action && data.action !== expectedAction) {
      console.warn("Unexpected Turnstile action:", data.action);
      return {
        ok: false,
        error: "การยืนยันความปลอดภัยไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง",
        status: 400,
      };
    }

    if (data.hostname) {
      const expectedHosts = buildExpectedHosts(request);
      if (expectedHosts.size > 0 && !expectedHosts.has(data.hostname)) {
        console.warn("Unexpected Turnstile hostname:", data.hostname);
        return {
          ok: false,
          error: "การยืนยันความปลอดภัยไม่ถูกต้อง กรุณารีเฟรชแล้วลองใหม่",
          status: 400,
        };
      }
    }

    return { ok: true };
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return {
      ok: false,
      error: "ระบบตรวจสอบความปลอดภัยไม่พร้อมใช้งานชั่วคราว",
      status: 503,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

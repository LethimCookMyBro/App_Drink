import { NextResponse } from "next/server";
import {
  verifyPassword,
  generateToken,
  createSession,
} from "@/backend/auth";
import {
  buildSessionCookieOptions,
  enforceRateLimit,
  enforceSameOrigin,
  jsonError,
  mapServerError,
} from "@/backend/apiUtils";
import logger from "@/backend/logger";
import { rateLimitConfigs } from "@/backend/rateLimit";
import { userLoginSchema } from "@/shared/schemas";
import { verifyTurnstileToken } from "@/backend/integrations/cloudflareTurnstile";
import { TURNSTILE_ACTIONS } from "@/shared/integrations/cloudflareTurnstile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const body = await request.json();
    const validation = userLoginSchema.safeParse({
      email: body?.email,
      password: body?.password,
    });
    if (!validation.success) {
      return jsonError(
        validation.error.issues[0]?.message || "ข้อมูลเข้าสู่ระบบไม่ถูกต้อง",
        400,
      );
    }
    const { email, password } = validation.data;

    const rateLimited = enforceRateLimit(request, rateLimitConfigs.auth, email);
    if (rateLimited) return rateLimited;

    const turnstileCheck = await verifyTurnstileToken(
      request,
      body?.turnstileToken,
      TURNSTILE_ACTIONS.authLogin,
    );
    if (!turnstileCheck.ok) {
      return jsonError(
        turnstileCheck.error || "การยืนยันความปลอดภัยไม่ผ่าน",
        turnstileCheck.status || 400,
      );
    }

    // Dynamic import to prevent crash when database is offline
    const { default: prisma } = await import("@/backend/db");

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        avatarUrl: true,
        image: true,
      },
    });

    if (!user || !user.password) {
      return jsonError("อีเมลหรือรหัสผ่านไม่ถูกต้อง", 401);
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return jsonError("อีเมลหรือรหัสผ่านไม่ถูกต้อง", 401);
    }

    // Generate token and create session
    const token = generateToken({
      userId: user.id,
    });

    await createSession(user.id, token);
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl ?? user.image,
        },
      },
      { status: 200 },
    );

    response.cookies.set(
      "auth-token",
      token,
      buildSessionCookieOptions(60 * 60 * 24 * 7),
    );

    return response;
  } catch (error) {
    logger.error("auth.login.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "บริการเข้าสู่ระบบไม่พร้อมใช้งานชั่วคราว");
  }
}

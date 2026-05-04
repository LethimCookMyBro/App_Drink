import { NextResponse } from "next/server";
import {
  hashPassword,
  generateToken,
  createSession,
} from "@/backend/auth";
import {
  buildSessionCookieOptions,
  enforceRateLimit,
  enforceSameOrigin,
  jsonError,
  mapServerError,
  parseJsonBody,
} from "@/backend/apiUtils";
import logger from "@/backend/logger";
import { verifyTurnstileToken } from "@/backend/integrations/cloudflareTurnstile";
import { rateLimitConfigs } from "@/backend/rateLimit";
import { userRegisterSchema } from "@/shared/schemas";
import { TURNSTILE_ACTIONS } from "@/shared/integrations/cloudflareTurnstile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.body;
    const validation = userRegisterSchema.safeParse({
      email: body?.email,
      password: body?.password,
      name: body?.name,
    });

    if (!validation.success) {
      return jsonError(
        validation.error.issues[0]?.message || "กรุณากรอกข้อมูลให้ครบถ้วน",
        400,
      );
    }

    const rateLimited = enforceRateLimit(
      request,
      rateLimitConfigs.auth,
      validation.data.email,
    );
    if (rateLimited) return rateLimited;

    const turnstileCheck = await verifyTurnstileToken(
      request,
      body?.turnstileToken,
      TURNSTILE_ACTIONS.authRegister,
    );
    if (!turnstileCheck.ok) {
      return jsonError(
        turnstileCheck.error || "การยืนยันความปลอดภัยไม่ผ่าน",
        turnstileCheck.status || 400,
      );
    }

    const email = validation.data.email;
    const password = validation.data.password;
    const name = validation.data.name;

    // Dynamic import to prevent crash when database is offline
    const { default: prisma } = await import("@/backend/db");

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user and session in a transaction
    const { user, token } = await prisma.$transaction(async (tx) => {
      // Check if email already exists
      const existingUser = await tx.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingUser) {
        throw new Error("EMAIL_TAKEN");
      }

      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          image: true,
        },
      });

      const newToken = generateToken({
        userId: newUser.id,
      });

      await createSession(newUser.id, newToken, tx);
      await tx.user.update({
        where: { id: newUser.id },
        data: { lastLoginAt: new Date() },
      });

      return { user: newUser, token: newToken };
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
      { status: 201 },
    );

    response.cookies.set(
      "auth-token",
      token,
      buildSessionCookieOptions(60 * 60 * 24 * 7),
    );

    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_TAKEN") {
      return jsonError("อีเมลนี้ถูกใช้งานแล้ว", 409);
    }

    logger.error("auth.register.failed", {
      message: error instanceof Error ? error.message : "unknown",
      error,
    });
    return mapServerError(error, "บริการสมัครสมาชิกไม่พร้อมใช้งานชั่วคราว");
  }
}

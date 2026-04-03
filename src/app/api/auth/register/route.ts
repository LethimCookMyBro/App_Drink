import { NextResponse } from "next/server";
import {
  hashPassword,
  generateToken,
  createSession,
} from "@/lib/auth";
import {
  buildSessionCookieOptions,
  enforceRateLimit,
  enforceSameOrigin,
  jsonError,
  mapServerError,
} from "@/lib/apiUtils";
import logger from "@/lib/logger";
import { verifyTurnstileToken } from "@/lib/cloudflare";
import { rateLimitConfigs } from "@/lib/rateLimit";
import { userRegisterSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const body = await request.json();
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
      "register",
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
    const { default: prisma } = await import("@/lib/db");

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return jsonError("อีเมลนี้ถูกใช้งานแล้ว", 409);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
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
      { status: 201 },
    );

    response.cookies.set(
      "auth-token",
      token,
      buildSessionCookieOptions(60 * 60 * 24 * 7),
    );

    return response;
  } catch (error) {
    logger.error("auth.register.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "บริการสมัครสมาชิกไม่พร้อมใช้งานชั่วคราว");
  }
}

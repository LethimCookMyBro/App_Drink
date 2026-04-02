import { NextResponse } from "next/server";
import {
  hashPassword,
  generateToken,
  createSession,
  normalizeEmail,
  sanitizeInput,
} from "@/lib/auth";
import {
  enforceRateLimit,
  enforceSameOrigin,
  jsonError,
} from "@/lib/apiUtils";
import { verifyTurnstileToken } from "@/lib/cloudflare";
import { rateLimitConfigs } from "@/lib/rateLimit";
import { userRegisterSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const rateLimited = enforceRateLimit(request, rateLimitConfigs.auth);
    if (rateLimited) return rateLimited;

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

    const email = normalizeEmail(validation.data.email);
    const password = validation.data.password;
    const name = sanitizeInput(validation.data.name);

    // Dynamic import to prevent crash when database is offline
    const { default: prisma } = await import("@/lib/db");

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
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
    });

    // Generate token and create session
    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    await createSession(user.id, token);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Set cookie and return response
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
      { status: 201 }
    );

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return jsonError("บริการสมัครสมาชิกไม่พร้อมใช้งานชั่วคราว", 503);
  }
}

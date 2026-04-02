import { NextResponse } from "next/server";
import {
  verifyPassword,
  generateToken,
  createSession,
  isValidEmail,
} from "@/lib/auth";
import {
  enforceRateLimit,
  enforceSameOrigin,
  jsonError,
} from "@/lib/apiUtils";
import { rateLimitConfigs } from "@/lib/rateLimit";
import { verifyTurnstileToken } from "@/lib/cloudflare";

export async function POST(request: Request) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const rateLimited = enforceRateLimit(request, rateLimitConfigs.auth);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    // Validate input
    if (!email || !password) {
      return jsonError("กรุณากรอกอีเมลและรหัสผ่าน", 400);
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return jsonError("รูปแบบอีเมลไม่ถูกต้อง", 400);
    }

    const turnstileCheck = await verifyTurnstileToken(
      request,
      body?.turnstileToken,
      "login",
    );
    if (!turnstileCheck.ok) {
      return jsonError(
        turnstileCheck.error || "การยืนยันความปลอดภัยไม่ผ่าน",
        turnstileCheck.status || 400,
      );
    }

    // Dynamic import to prevent crash when database is offline
    const { default: prisma } = await import("@/lib/db");

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
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
          avatarUrl: user.avatarUrl,
        },
      },
      { status: 200 }
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
    console.error("Login error:", error);
    return jsonError("บริการเข้าสู่ระบบไม่พร้อมใช้งานชั่วคราว", 503);
  }
}

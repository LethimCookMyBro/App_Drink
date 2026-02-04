import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { adminLoginSchema } from "@/lib/validation";
import { signAdminToken } from "@/lib/adminAuth";
import { enforceRateLimit, enforceSameOrigin, jsonError } from "@/lib/apiUtils";
import { rateLimitConfigs } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const rateLimited = enforceRateLimit(request, rateLimitConfigs.auth);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const usernameInput =
      typeof body?.username === "string"
        ? body.username
        : typeof body?.email === "string"
          ? body.email
          : "";
    const validation = adminLoginSchema.safeParse({
      username: usernameInput,
      password: body?.password,
    });
    if (!validation.success) {
      return jsonError(
        validation.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง",
        400,
      );
    }

    const username = validation.data.username;
    const { password } = validation.data;

    const { default: prisma } = await import("@/lib/db");
    let admin = await prisma.admin.findUnique({ where: { email: username } });

    const envAdminUsername = (
      process.env.ADMIN_SEED_USERNAME ||
      process.env.ADMIN_SEED_EMAIL ||
      ""
    ).trim();
    const envAdminPassword = process.env.ADMIN_SEED_PASSWORD || "";
    const envAdminName = process.env.ADMIN_SEED_NAME || "Admin";
    const envCredentialsMatch =
      !!envAdminUsername &&
      !!envAdminPassword &&
      username === envAdminUsername &&
      password === envAdminPassword;

    let envAuthenticated = false;
    if (envCredentialsMatch) {
      const passwordHash = await bcrypt.hash(envAdminPassword, 12);
      if (!admin) {
        admin = await prisma.admin.create({
          data: {
            email: envAdminUsername,
            password: passwordHash,
            name: envAdminName,
            role: "SUPER_ADMIN",
            isActive: true,
          },
        });
      } else {
        // Keep env credentials as the source of truth when explicitly used
        admin = await prisma.admin.update({
          where: { id: admin.id },
          data: { password: passwordHash, isActive: true },
        });
      }
      envAuthenticated = true;
    }

    if (!admin || !admin.isActive) {
      return jsonError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง", 401);
    }

    const isPasswordValid = envAuthenticated
      ? true
      : await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return jsonError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง", 401);
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const token = signAdminToken(admin);

    const response = NextResponse.json(
      {
        success: true,
        message: "เข้าสู่ระบบสำเร็จ",
        admin: {
          username: admin.email,
          name: admin.name,
          role: admin.role,
        },
      },
      { status: 200 },
    );

    response.cookies.set("admin-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Admin login error:", error);
    return jsonError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ", 500);
  }
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { adminLoginSchema, hasSqlInjection } from "@/lib/validation";

// Admin credentials from environment variables (more secure)
// Fallback to default for backward compatibility
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "SuperAdmin_3175!";
const ADMIN_PASSWORD_HASH =
  process.env.ADMIN_PASSWORD_HASH ||
  "$2b$12$s/mrk8BkgAQDSx/CQ33Z7OqxXfxecgCsqHYATz0Xt7vz.cNhR2bUG";

const JWT_SECRET = process.env.JWT_SECRET || "wong-taek-admin-secret-key";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input with SQL injection protection
    const validation = adminLoginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    const { username, password } = validation.data;

    // Additional SQL injection check
    if (hasSqlInjection(username) || hasSqlInjection(password)) {
      console.warn("SQL injection attempt detected:", { username });
      return NextResponse.json(
        { error: "รูปแบบข้อมูลไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    // Check username (case-sensitive)
    if (username !== ADMIN_USERNAME) {
      // Use same error message to prevent username enumeration
      return NextResponse.json(
        { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 },
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 },
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        role: "admin",
        username: ADMIN_USERNAME,
        iat: Math.floor(Date.now() / 1000),
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    // Set cookie and return response
    const response = NextResponse.json(
      {
        success: true,
        message: "เข้าสู่ระบบสำเร็จ",
        admin: {
          username: ADMIN_USERNAME,
          role: "SUPER_ADMIN",
        },
      },
      { status: 200 },
    );

    response.cookies.set("admin-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" },
      { status: 500 },
    );
  }
}

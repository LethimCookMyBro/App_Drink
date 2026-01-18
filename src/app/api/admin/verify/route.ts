import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "wong-taek-admin-secret-key";

export async function GET(request: Request) {
  try {
    // Get token from cookie
    const cookieHeader = request.headers.get("cookie");
    const adminToken = cookieHeader
      ?.split(";")
      .find((c) => c.trim().startsWith("admin-token="))
      ?.split("=")[1];

    if (!adminToken) {
      return NextResponse.json(
        { authenticated: false, error: "ไม่พบ token" },
        { status: 401 },
      );
    }

    // Verify JWT
    const decoded = jwt.verify(adminToken, JWT_SECRET) as {
      role: string;
      username: string;
    };

    if (decoded.role !== "admin") {
      return NextResponse.json(
        { authenticated: false, error: "ไม่มีสิทธิ์เข้าถึง" },
        { status: 403 },
      );
    }

    return NextResponse.json({
      authenticated: true,
      admin: {
        username: decoded.username,
        role: "SUPER_ADMIN",
      },
    });
  } catch {
    return NextResponse.json(
      { authenticated: false, error: "Token ไม่ถูกต้องหรือหมดอายุ" },
      { status: 401 },
    );
  }
}

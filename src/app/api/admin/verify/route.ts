import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({
        authenticated: false,
        error: "ไม่พบ token",
        code: "NO_SESSION",
      });
    }

    return NextResponse.json({
      authenticated: true,
      admin: {
        username: admin.email,
        name: admin.name,
        role: admin.role,
        lastLoginAt: admin.lastLoginAt,
      },
    });
  } catch (error) {
    console.error("Admin verify error:", error);
    return NextResponse.json(
      { authenticated: false, error: "Server misconfiguration" },
      { status: 500 },
    );
  }
}

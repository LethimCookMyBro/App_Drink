import { NextResponse } from "next/server";
import { deleteSession, getTokenFromRequest } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const token = getTokenFromRequest(request);

    if (token) {
      await deleteSession(token);
    }

    const response = NextResponse.json(
      { success: true, message: "ออกจากระบบสำเร็จ" },
      { status: 200 }
    );

    // Clear the auth cookie
    response.cookies.set("auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการออกจากระบบ" },
      { status: 500 }
    );
  }
}

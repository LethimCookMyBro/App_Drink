import { NextResponse } from "next/server";
import { validateSession, getTokenFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const token = getTokenFromRequest(request);

    if (!token) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200 }
      );
    }

    const session = await validateSession(token);

    if (!session) {
      const response = NextResponse.json(
        { authenticated: false, user: null },
        { status: 200 }
      );

      // Clear invalid token
      response.cookies.set("auth-token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      });

      return response;
    }

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          avatarUrl: session.user.avatarUrl,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Me error:", error);
    return NextResponse.json(
      { authenticated: false, user: null, error: "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}

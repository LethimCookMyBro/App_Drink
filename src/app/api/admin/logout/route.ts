import { NextResponse } from "next/server";
import { enforceSameOrigin } from "@/lib/apiUtils";

export async function POST(request: Request) {
  const originBlocked = enforceSameOrigin(request);
  if (originBlocked) return originBlocked;

  const response = NextResponse.json(
    { success: true, message: "ออกจากระบบสำเร็จ" },
    { status: 200 },
  );

  // Clear admin token cookie
  response.cookies.set("admin-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0, // Expire immediately
    path: "/",
  });

  return response;
}

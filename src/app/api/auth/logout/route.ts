import { deleteSession, getTokenFromRequest } from "@/lib/auth";
import {
  enforceRateLimit,
  enforceSameOrigin,
  jsonError,
  jsonOk,
} from "@/lib/apiUtils";
import {
  clearNextAuthSessionCookies,
  deleteNextAuthSessionFromRequest,
} from "@/lib/nextAuth";
import { rateLimitConfigs } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const rateLimited = enforceRateLimit(request, rateLimitConfigs.auth);
    if (rateLimited) return rateLimited;

    const token = getTokenFromRequest(request);

    if (token) {
      await deleteSession(token);
    }

    await deleteNextAuthSessionFromRequest(request);

    const response = jsonOk({ success: true, message: "ออกจากระบบสำเร็จ" });
    response.cookies.set("auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    clearNextAuthSessionCookies(response);

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return jsonError("ไม่สามารถออกจากระบบได้ในขณะนี้", 500);
  }
}

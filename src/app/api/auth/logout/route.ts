import { deleteSession, getTokenFromRequest } from "@/lib/auth";
import {
  buildSessionCookieOptions,
  enforceRateLimit,
  enforceSameOrigin,
  jsonOk,
  mapServerError,
} from "@/lib/apiUtils";
import logger from "@/lib/logger";
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
    response.cookies.set("auth-token", "", buildSessionCookieOptions(0));
    clearNextAuthSessionCookies(response);

    return response;
  } catch (error) {
    logger.error("auth.logout.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "ไม่สามารถออกจากระบบได้ในขณะนี้");
  }
}

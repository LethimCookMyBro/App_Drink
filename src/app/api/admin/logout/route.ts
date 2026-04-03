import {
  buildSessionCookieOptions,
  enforceSameOrigin,
  jsonOk,
  mapServerError,
} from "@/lib/apiUtils";
import logger from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const response = jsonOk({ success: true, message: "ออกจากระบบสำเร็จ" });
    response.cookies.set("admin-token", "", buildSessionCookieOptions(0));

    return response;
  } catch (error) {
    logger.error("admin.logout.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "ไม่สามารถออกจากระบบได้ในขณะนี้");
  }
}

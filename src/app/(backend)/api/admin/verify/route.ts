import {
  getAdminFromCookies,
  getAdminTokenFromCookies,
  verifyAdminTokenDetailed,
} from "@/backend/adminAuth";
import { jsonError, jsonOk } from "@/backend/apiUtils";
import logger from "@/backend/logger";
import { maskEmail } from "@/backend/privacy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const token = await getAdminTokenFromCookies();
    if (!token) {
      return jsonOk({
        authenticated: false,
        error: "ไม่พบ token",
        code: "NO_SESSION",
      });
    }

    const verification = verifyAdminTokenDetailed(token);
    if (!verification.payload) {
      return jsonOk({
        authenticated: false,
        error: "เซสชันไม่ถูกต้อง",
        code: verification.reason === "expired" ? "EXPIRED" : "INVALID",
      });
    }

    const admin = await getAdminFromCookies();
    if (!admin) {
      return jsonOk({
        authenticated: false,
        error: "ไม่พบเซสชันที่ใช้งานได้",
        code: "INVALID",
      });
    }

    return jsonOk({
      authenticated: true,
      admin: {
        username: maskEmail(admin.email),
        name: admin.name,
        role: admin.role,
        lastLoginAt: admin.lastLoginAt,
      },
    });
  } catch (error) {
    logger.error("admin.verify.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return jsonError("Server misconfiguration", 500, {
      authenticated: false,
    });
  }
}

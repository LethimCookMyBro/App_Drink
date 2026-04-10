import { getAdminOverviewData } from "@/backend/adminData";
import { requireAdmin } from "@/backend/adminAuth";
import { jsonError, jsonOk, mapServerError } from "@/backend/apiUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 401);
    }

    return jsonOk({ ...(await getAdminOverviewData(admin)) });
  } catch (error) {
    return mapServerError(error, "ไม่สามารถโหลดภาพรวมแอดมินได้");
  }
}

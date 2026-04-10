import { getAdminUsersData } from "@/backend/adminData";
import { getAdminAccessError, requireAdminRole } from "@/backend/adminAuth";
import { jsonError, jsonOk, mapServerError } from "@/backend/apiUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const access = await requireAdminRole("ADMIN");
    if (access.kind !== "ok") {
      const { message, status } = getAdminAccessError(access);
      return jsonError(message, status);
    }

    return jsonOk({ ...(await getAdminUsersData(access.admin)) });
  } catch (error) {
    return mapServerError(error, "ไม่สามารถโหลดข้อมูลผู้ใช้ได้");
  }
}

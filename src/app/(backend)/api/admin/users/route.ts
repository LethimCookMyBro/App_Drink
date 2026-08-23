import { getAdminUsersData } from "@/backend/adminData";
import { parseAdminUsersQuery } from "@/backend/adminUsersQuery";
import { getAdminAccessError, requireAdminRole } from "@/backend/adminAuth";
import { jsonError, jsonOk, mapServerError } from "@/backend/apiUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const access = await requireAdminRole("ADMIN");
    if (access.kind !== "ok") {
      const { message, status } = getAdminAccessError(access);
      return jsonError(message, status);
    }

    const parsed = parseAdminUsersQuery(new URL(request.url).searchParams);
    if (!parsed.ok) {
      return jsonError(parsed.error, 400);
    }

    return jsonOk({ ...(await getAdminUsersData(access.admin, parsed.query)) });
  } catch (error) {
    return mapServerError(error, "ไม่สามารถโหลดข้อมูลผู้ใช้ได้");
  }
}

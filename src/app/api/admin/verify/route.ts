import { requireAdmin } from "@/lib/adminAuth";
import { jsonError, jsonOk } from "@/lib/apiUtils";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return jsonOk({
        authenticated: false,
        error: "ไม่พบ token",
        code: "NO_SESSION",
      });
    }

    return jsonOk({
      authenticated: true,
      admin: {
        username: admin.email,
        name: admin.name,
        role: admin.role,
        lastLoginAt: admin.lastLoginAt,
      },
    });
  } catch (error) {
    console.error("Admin verify error:", error);
    return jsonError("Server misconfiguration", 500, {
      authenticated: false,
    });
  }
}

import { getAuthenticatedAppUser, clearLegacyAuthCookie } from "@/lib/appAuth";
import { jsonError, jsonOk } from "@/lib/apiUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { user, clearLegacyCookie } = await getAuthenticatedAppUser(request);
    const response = jsonOk({
      authenticated: Boolean(user),
      user: user
        ? {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl,
          }
        : null,
    });

    if (clearLegacyCookie) {
      clearLegacyAuthCookie(response);
    }

    return response;
  } catch (error) {
    console.error("Me error:", error);
    return jsonError("เกิดข้อผิดพลาด", 500, {
      authenticated: false,
      user: null,
    });
  }
}

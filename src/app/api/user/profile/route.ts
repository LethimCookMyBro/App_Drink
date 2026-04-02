import {
  enforceRateLimit,
  enforceSameOrigin,
  jsonError,
  jsonOk,
} from "@/lib/apiUtils";
import { sanitizeInput } from "@/lib/auth";
import {
  clearLegacyAuthCookie,
  getAuthenticatedAppUser,
} from "@/lib/appAuth";
import { rateLimitConfigs } from "@/lib/rateLimit";
import {
  EMPTY_USER_GAME_STATS,
  getUserStatsAndRecentSessions,
} from "@/lib/userGameStats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { user, clearLegacyCookie } = await getAuthenticatedAppUser(request);
    if (!user) {
      const response = jsonOk({
        user: null,
        stats: EMPTY_USER_GAME_STATS,
        authenticated: false,
        message: "กรุณาเข้าสู่ระบบเพื่อดูข้อมูลโปรไฟล์",
      });
      if (clearLegacyCookie) {
        clearLegacyAuthCookie(response);
      }

      return response;
    }

    const { default: prisma } = await import("@/lib/db");
    const { stats } = await getUserStatsAndRecentSessions(prisma, user.id, 1);

    const authenticatedResponse = jsonOk({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      stats,
    });

    if (clearLegacyCookie) {
      clearLegacyAuthCookie(authenticatedResponse);
    }

    return authenticatedResponse;
  } catch (error) {
    console.error("Profile error:", error);
    return jsonError("เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์", 500, {
      user: null,
      stats: EMPTY_USER_GAME_STATS,
      authenticated: false,
      error: "เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์",
    });
  }
}

export async function PATCH(request: Request) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const rateLimited = enforceRateLimit(request, rateLimitConfigs.profile);
    if (rateLimited) return rateLimited;

    const { user } = await getAuthenticatedAppUser(request);
    if (!user) {
      return jsonError("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่", 401);
    }

    const { default: prisma } = await import("@/lib/db");

    const body = await request.json();
    const { name, avatarUrl } = body;

    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        name.trim().length < 1 ||
        name.length > 50
      ) {
        return jsonError("ชื่อต้องมี 1-50 ตัวอักษร", 400);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(name !== undefined && { name: sanitizeInput(name) }),
        ...(avatarUrl !== undefined && { avatarUrl, image: avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        image: true,
      },
    });

    return jsonOk({
      success: true,
      user: {
        ...updatedUser,
        avatarUrl: updatedUser.avatarUrl ?? updatedUser.image,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return jsonError("เกิดข้อผิดพลาดในการอัพเดทข้อมูล", 500);
  }
}

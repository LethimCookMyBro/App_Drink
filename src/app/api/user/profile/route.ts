import {
  enforceRateLimit,
  enforceSameOrigin,
  jsonError,
  jsonOk,
} from "@/lib/apiUtils";
import { getTokenFromRequest, sanitizeInput, validateSession } from "@/lib/auth";
import { rateLimitConfigs } from "@/lib/rateLimit";
import {
  EMPTY_USER_GAME_STATS,
  getUserStatsAndRecentSessions,
} from "@/lib/userGameStats";

export async function GET(request: Request) {
  try {
    const token = getTokenFromRequest(request);

    if (!token) {
      return jsonOk({
        user: null,
        stats: EMPTY_USER_GAME_STATS,
        authenticated: false,
        message: "กรุณาเข้าสู่ระบบเพื่อดูข้อมูลโปรไฟล์",
      });
    }

    const session = await validateSession(token);

    if (!session) {
      return jsonOk({
        user: null,
        stats: EMPTY_USER_GAME_STATS,
        authenticated: false,
        message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",
      });
    }

    const { default: prisma } = await import("@/lib/db");
    const { stats } = await getUserStatsAndRecentSessions(prisma, session.user.id, 1);

    return jsonOk({
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        avatarUrl: session.user.avatarUrl,
        createdAt: session.user.createdAt,
      },
      stats,
    });
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

// Update user profile
export async function PATCH(request: Request) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const rateLimited = enforceRateLimit(request, rateLimitConfigs.profile);
    if (rateLimited) return rateLimited;

    const token = getTokenFromRequest(request);

    if (!token) {
      return jsonError("กรุณาเข้าสู่ระบบ", 401);
    }

    const session = await validateSession(token);

    if (!session) {
      return jsonError("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่", 401);
    }

    // Get Prisma client dynamically
    const { default: prisma } = await import("@/lib/db");

    const body = await request.json();
    const { name, avatarUrl } = body;

    // Validate name
    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        name.trim().length < 1 ||
        name.length > 50
      ) {
        return jsonError("ชื่อต้องมี 1-50 ตัวอักษร", 400);
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined && { name: sanitizeInput(name) }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
      },
    });

    return jsonOk({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return jsonError("เกิดข้อผิดพลาดในการอัพเดทข้อมูล", 500);
  }
}

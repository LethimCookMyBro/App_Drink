import {
  enforceRateLimit,
  enforceSameOrigin,
  jsonError,
  jsonOk,
  mapServerError,
} from "@/lib/apiUtils";
import env from "@/lib/env";
import {
  clearLegacyAuthCookie,
  getAuthenticatedAppUser,
} from "@/lib/appAuth";
import logger from "@/lib/logger";
import { rateLimitConfigs } from "@/lib/rateLimit";
import { profileUpdateSchema } from "@/lib/schemas";
import {
  EMPTY_USER_GAME_STATS,
  getUserStatsAndRecentSessions,
} from "@/lib/userGameStats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeAvatarUrl(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "string" || value.length > 500) {
    return undefined;
  }

  try {
    const parsed = new URL(value);
    const isAllowedProtocol =
      parsed.protocol === "https:" ||
      (!env.isProduction && parsed.protocol === "http:");

    if (!isAllowedProtocol) {
      return undefined;
    }

    return parsed.toString();
  } catch {
    return undefined;
  }
}

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
      },
      stats,
    });

    if (clearLegacyCookie) {
      clearLegacyAuthCookie(authenticatedResponse);
    }

    return authenticatedResponse;
  } catch (error) {
    logger.error("profile.get.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
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
    const validation = profileUpdateSchema.safeParse({
      name: body?.name,
      avatarUrl: body?.avatarUrl,
    });
    if (!validation.success) {
      return jsonError(
        validation.error.issues[0]?.message || "ข้อมูลโปรไฟล์ไม่ถูกต้อง",
        400,
      );
    }
    const { name } = validation.data;
    const avatarUrl = normalizeAvatarUrl(validation.data.avatarUrl);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(name !== undefined && { name }),
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
    logger.error("profile.update.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "เกิดข้อผิดพลาดในการอัพเดทข้อมูล");
  }
}

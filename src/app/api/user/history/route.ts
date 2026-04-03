import {
  clearLegacyAuthCookie,
  getAuthenticatedAppUser,
} from "@/lib/appAuth";
import { jsonError, jsonOk } from "@/lib/apiUtils";
import logger from "@/lib/logger";
import {
  EMPTY_USER_GAME_STATS,
  getUserStatsAndRecentSessions,
} from "@/lib/userGameStats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { user, clearLegacyCookie } = await getAuthenticatedAppUser(request);

    const unauthenticatedResponse = jsonOk({
      authenticated: false,
      stats: EMPTY_USER_GAME_STATS,
      history: [],
      message: "กรุณาเข้าสู่ระบบเพื่อดูประวัติการเล่น",
    });

    if (!user) {
      if (clearLegacyCookie) {
        clearLegacyAuthCookie(unauthenticatedResponse);
      }

      return unauthenticatedResponse;
    }

    const { default: prisma } = await import("@/lib/db");
    const { stats, sessions } = await getUserStatsAndRecentSessions(
      prisma,
      user.id,
      50,
    );

    const history = sessions.map((gs) => {
      const duration = gs.endedAt
        ? Math.round(
            (new Date(gs.endedAt).getTime() -
              new Date(gs.startedAt).getTime()) /
              (1000 * 60)
          )
        : 0;

      return {
        id: gs.id,
        name: gs.room.name,
        mode: gs.mode,
        players: gs.room.maxPlayers,
        duration:
          duration > 60
            ? `${Math.round(duration / 60)} ชม.`
            : `${duration} นาที`,
        date: formatDate(gs.startedAt),
        roundCount: gs.roundCount,
      };
    });

    const response = jsonOk({
      authenticated: true,
      stats,
      history,
    });

    if (clearLegacyCookie) {
      clearLegacyAuthCookie(response);
    }

    return response;
  } catch (error) {
    logger.error("history.get.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return jsonError("เกิดข้อผิดพลาดในการดึงข้อมูลประวัติการเล่น", 500, {
      authenticated: false,
      stats: EMPTY_USER_GAME_STATS,
      history: [],
      error: "เกิดข้อผิดพลาดในการดึงข้อมูลประวัติการเล่น",
    });
  }
}

function formatDate(date: Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
  );

  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");

  if (diffDays === 0) {
    return `วันนี้ ${hours}:${minutes}`;
  } else if (diffDays === 1) {
    return `เมื่อวาน ${hours}:${minutes}`;
  } else {
    const day = d.getDate();
    const month = [
      "ม.ค.",
      "ก.พ.",
      "มี.ค.",
      "เม.ย.",
      "พ.ค.",
      "มิ.ย.",
      "ก.ค.",
      "ส.ค.",
      "ก.ย.",
      "ต.ค.",
      "พ.ย.",
      "ธ.ค.",
    ][d.getMonth()];
    return `${day} ${month}`;
  }
}

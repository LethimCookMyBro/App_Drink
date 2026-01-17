import { NextResponse } from "next/server";
import { validateSession, getTokenFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const token = getTokenFromRequest(request);

    if (!token) {
      return NextResponse.json({
        authenticated: false,
        stats: { totalGames: 0, totalDrinks: 0, totalPlayTime: 0 },
        history: [],
        message: "กรุณาเข้าสู่ระบบเพื่อดูประวัติการเล่น",
      });
    }

    const session = await validateSession(token);

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        stats: { totalGames: 0, totalDrinks: 0, totalPlayTime: 0 },
        history: [],
        message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",
      });
    }

    // Get Prisma client dynamically
    const { default: prisma } = await import("@/lib/db");

    // Get user's game sessions with statistics
    const gameSessions = await prisma.gameSession.findMany({
      where: {
        userId: session.user.id,
        status: "COMPLETED",
      },
      include: {
        room: true,
        events: true,
      },
      orderBy: {
        startedAt: "desc",
      },
      take: 50,
    });

    // Calculate statistics
    const totalGames = gameSessions.length;

    let totalDrinks = 0;
    let totalPlayTimeMs = 0;

    for (const gameSession of gameSessions) {
      // Count drinks from events
      const drinkEvents = gameSession.events.filter(
        (e) => e.type === "DRANK" || e.type === "SKIPPED"
      );
      totalDrinks += drinkEvents.length;

      // Calculate play time
      if (gameSession.endedAt) {
        totalPlayTimeMs +=
          new Date(gameSession.endedAt).getTime() -
          new Date(gameSession.startedAt).getTime();
      }
    }

    const totalPlayTimeHours =
      Math.round((totalPlayTimeMs / (1000 * 60 * 60)) * 10) / 10;

    // Format history items
    const history = gameSessions.map((gs) => {
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

    return NextResponse.json({
      authenticated: true,
      stats: {
        totalGames,
        totalDrinks,
        totalPlayTime: totalPlayTimeHours,
      },
      history,
    });
  } catch (error) {
    console.error("History error:", error);
    return NextResponse.json({
      authenticated: false,
      stats: { totalGames: 0, totalDrinks: 0, totalPlayTime: 0 },
      history: [],
      error: "เกิดข้อผิดพลาดในการดึงข้อมูล - กรุณาเชื่อมต่อ Database",
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

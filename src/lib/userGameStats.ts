import type { PrismaClient } from "@prisma/client";

export interface UserGameStats {
  totalGames: number;
  totalDrinks: number;
  totalPlayTime: number;
}

export interface UserHistorySession {
  id: string;
  mode: string;
  roundCount: number;
  startedAt: Date;
  endedAt: Date | null;
  room: {
    name: string;
    maxPlayers: number;
  };
}

export const EMPTY_USER_GAME_STATS: UserGameStats = {
  totalGames: 0,
  totalDrinks: 0,
  totalPlayTime: 0,
};

export async function getUserStatsAndRecentSessions(
  prisma: PrismaClient,
  userId: string,
  historyLimit = 50,
): Promise<{ stats: UserGameStats; sessions: UserHistorySession[] }> {
  const completedSessionWhere = {
    userId,
    status: "COMPLETED" as const,
  };

  const [totalGames, totalDrinkAggregate, historySessions, lifetimeSessions] = await Promise.all([
    prisma.gameSession.count({
      where: completedSessionWhere,
    }),
    prisma.gameSession.aggregate({
      where: completedSessionWhere,
      _sum: {
        totalDrinks: true,
      },
    }),
    prisma.gameSession.findMany({
      where: completedSessionWhere,
      select: {
        id: true,
        mode: true,
        roundCount: true,
        startedAt: true,
        endedAt: true,
        room: {
          select: {
            name: true,
            maxPlayers: true,
          },
        },
      },
      orderBy: {
        startedAt: "desc",
      },
      take: historyLimit,
    }),
    prisma.gameSession.findMany({
      where: completedSessionWhere,
      select: {
        startedAt: true,
        endedAt: true,
      },
    }),
  ]);
  const totalDrinks = totalDrinkAggregate._sum?.totalDrinks ?? 0;

  const totalPlayTimeMs = lifetimeSessions.reduce((sum, session) => {
    if (!session.endedAt) {
      return sum;
    }

    return sum + (session.endedAt.getTime() - session.startedAt.getTime());
  }, 0);

  return {
    stats: {
      totalGames,
      totalDrinks,
      totalPlayTime:
        Math.round((totalPlayTimeMs / (1000 * 60 * 60)) * 10) / 10,
    },
    sessions: historySessions,
  };
}

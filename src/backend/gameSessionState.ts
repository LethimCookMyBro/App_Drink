import {
  GameEventType,
  type Prisma,
  type PrismaClient,
  QuestionType,
} from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

const MIXED_MODE_ROTATION: readonly QuestionType[] = [
  QuestionType.QUESTION,
  QuestionType.VOTE,
  QuestionType.TRUTH,
  QuestionType.DARE,
  QuestionType.CHAOS,
] as const;

const SESSION_STATE_SELECT = {
  id: true,
  mode: true,
  status: true,
  resumePath: true,
  roundCount: true,
  totalDrinks: true,
  durationMs: true,
  currentPlayerId: true,
  currentQuestionId: true,
  currentQuestionText: true,
  currentQuestionType: true,
  currentQuestionLevel: true,
  currentQuestionIs18Plus: true,
  currentQuestionIsCustom: true,
  startedAt: true,
  endedAt: true,
} satisfies Prisma.GameSessionSelect;

type SessionStateRecord = Prisma.GameSessionGetPayload<{
  select: typeof SESSION_STATE_SELECT;
}>;

export type SessionStateSnapshot = {
  id: string;
  mode: string;
  status: string;
  resumePath: string | null;
  roundCount: number;
  totalDrinks: number;
  durationMs: number;
  currentPlayerId: string | null;
  currentQuestionId: string | null;
  currentQuestionText: string | null;
  currentQuestionType: string | null;
  currentQuestionLevel: number | null;
  currentQuestionIs18Plus: boolean;
  currentQuestionIsCustom: boolean;
  startedAt: Date;
  endedAt: Date | null;
};

export type SessionPlayerStats = {
  id: string;
  name: string;
  drinkCount: number;
  questionsAnswered: number;
};

export type SessionCompletionSummary = {
  totalRounds: number;
  totalDrinks: number;
  players: SessionPlayerStats[];
};

type RoomQuestionRecord = {
  id: string;
  text: string;
  type: QuestionType;
  level: number;
  is18Plus: boolean;
};

type SessionChoice = {
  currentPlayerId: string | null;
  currentQuestionId: string | null;
  currentQuestionText: string | null;
  currentQuestionType: QuestionType | null;
  currentQuestionLevel: number | null;
  currentQuestionIs18Plus: boolean;
  currentQuestionIsCustom: boolean;
};

type SessionTurnHydrationCandidate = {
  status: string;
  currentPlayerId?: string | null;
  currentQuestionText?: string | null;
  currentQuestionType?: string | null;
};

function getPreferredQuestionTypes(
  mode: string,
  completedRounds: number,
): QuestionType[] {
  switch (mode) {
    case "QUESTION":
      return [QuestionType.QUESTION];
    case "VOTE":
      return [QuestionType.VOTE];
    case "TRUTH_OR_DARE":
      return completedRounds % 2 === 0
        ? [QuestionType.TRUTH, QuestionType.DARE]
        : [QuestionType.DARE, QuestionType.TRUTH];
    case "CHAOS":
      return [QuestionType.CHAOS];
    case "MIXED":
    default: {
      const nextType = MIXED_MODE_ROTATION[
        completedRounds % MIXED_MODE_ROTATION.length
      ];
      return [nextType, ...MIXED_MODE_ROTATION.filter((type) => type !== nextType)];
    }
  }
}

function shouldUseCustomQuestion(
  mode: string,
  completedRounds: number,
): boolean {
  if (mode === "CHAOS") {
    return false;
  }

  return completedRounds % 4 === 0;
}

function tryParseCustomQuestionId(data: string | null): string | null {
  if (!data) {
    return null;
  }

  try {
    const parsed = JSON.parse(data) as { customQuestionId?: unknown };
    return typeof parsed.customQuestionId === "string"
      ? parsed.customQuestionId
      : null;
  } catch {
    return null;
  }
}

export function toSessionStateSnapshot(
  session: SessionStateRecord | null | undefined,
): SessionStateSnapshot | null {
  if (!session) {
    return null;
  }

  return {
    id: session.id,
    mode: session.mode,
    status: session.status,
    resumePath: session.resumePath ?? null,
    roundCount: session.roundCount,
    totalDrinks: session.totalDrinks,
    durationMs: session.durationMs,
    currentPlayerId: session.currentPlayerId ?? null,
    currentQuestionId: session.currentQuestionId ?? null,
    currentQuestionText: session.currentQuestionText ?? null,
    currentQuestionType: session.currentQuestionType ?? null,
    currentQuestionLevel: session.currentQuestionLevel ?? null,
    currentQuestionIs18Plus: session.currentQuestionIs18Plus,
    currentQuestionIsCustom: session.currentQuestionIsCustom,
    startedAt: session.startedAt,
    endedAt: session.endedAt ?? null,
  };
}

export function sessionNeedsCurrentTurnHydration(
  session: SessionTurnHydrationCandidate | null | undefined,
): boolean {
  if (!session || session.status !== "ACTIVE") {
    return false;
  }

  return (
    !session.currentPlayerId ||
    !session.currentQuestionText ||
    !session.currentQuestionType
  );
}

export async function chooseNextSessionState(
  prisma: DbClient,
  sessionId: string,
): Promise<SessionChoice> {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      roomId: true,
      mode: true,
      roundCount: true,
      room: {
        select: {
          difficulty: true,
          is18Plus: true,
          players: {
            orderBy: { joinedAt: "asc" },
            select: {
              id: true,
            },
          },
          questions: {
            where: { sessionId },
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              text: true,
              type: true,
              level: true,
              is18Plus: true,
            },
          },
        },
      },
      events: {
        select: {
          questionId: true,
          data: true,
        },
      },
    },
  });

  if (!session) {
    return {
      currentPlayerId: null,
      currentQuestionId: null,
      currentQuestionText: null,
      currentQuestionType: null,
      currentQuestionLevel: null,
      currentQuestionIs18Plus: false,
      currentQuestionIsCustom: false,
    };
  }

  const playerIds = session.room.players.map((player) => player.id);
  if (playerIds.length === 0) {
    return {
      currentPlayerId: null,
      currentQuestionId: null,
      currentQuestionText: null,
      currentQuestionType: null,
      currentQuestionLevel: null,
      currentQuestionIs18Plus: false,
      currentQuestionIsCustom: false,
    };
  }

  const currentPlayerId = playerIds[session.roundCount % playerIds.length] ?? null;
  const usedQuestionIds = new Set(
    session.events
      .map((event) => event.questionId)
      .filter((questionId): questionId is string => typeof questionId === "string"),
  );
  const usedCustomQuestionIds = new Set(
    session.events
      .map((event) => tryParseCustomQuestionId(event.data))
      .filter((questionId): questionId is string => typeof questionId === "string"),
  );

  const availableCustomQuestions = session.room.questions.filter(
    (question) => !usedCustomQuestionIds.has(question.id),
  );
  const preferredTypes = getPreferredQuestionTypes(
    session.mode,
    session.roundCount,
  );
  const shouldPreferCustom =
    availableCustomQuestions.length > 0 &&
    shouldUseCustomQuestion(session.mode, session.roundCount);

  if (shouldPreferCustom) {
    const customQuestion = availableCustomQuestions[0];
    return {
      currentPlayerId,
      currentQuestionId: customQuestion.id,
      currentQuestionText: customQuestion.text,
      currentQuestionType: customQuestion.type,
      currentQuestionLevel: customQuestion.level,
      currentQuestionIs18Plus: customQuestion.is18Plus,
      currentQuestionIsCustom: true,
    };
  }

  const baseWhere = {
    isActive: true,
    isPublic: true,
    level: { lte: session.room.difficulty },
    ...(session.room.is18Plus ? {} : { is18Plus: false }),
    ...(usedQuestionIds.size > 0
      ? { id: { notIn: Array.from(usedQuestionIds) } }
      : {}),
  } satisfies Prisma.QuestionWhereInput;

  for (const questionType of preferredTypes) {
    const question = await prisma.question.findFirst({
      where: {
        ...baseWhere,
        type: questionType,
      },
      orderBy: [{ usageCount: "asc" }, { updatedAt: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        text: true,
        type: true,
        level: true,
        is18Plus: true,
      },
    });

    if (question) {
      return {
        currentPlayerId,
        currentQuestionId: question.id,
        currentQuestionText: question.text,
        currentQuestionType: question.type,
        currentQuestionLevel: question.level,
        currentQuestionIs18Plus: question.is18Plus,
        currentQuestionIsCustom: false,
      };
    }
  }

  const fallbackQuestion = await prisma.question.findFirst({
    where: {
      isActive: true,
      isPublic: true,
      ...(session.room.is18Plus ? {} : { is18Plus: false }),
    },
    orderBy: [{ usageCount: "asc" }, { updatedAt: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      text: true,
      type: true,
      level: true,
      is18Plus: true,
    },
  });

  if (!fallbackQuestion) {
    return {
      currentPlayerId,
      currentQuestionId: null,
      currentQuestionText: "ยังไม่มีคำถามพร้อมใช้งาน",
      currentQuestionType: QuestionType.QUESTION,
      currentQuestionLevel: 1,
      currentQuestionIs18Plus: false,
      currentQuestionIsCustom: false,
    };
  }

  return {
    currentPlayerId,
    currentQuestionId: fallbackQuestion.id,
    currentQuestionText: fallbackQuestion.text,
    currentQuestionType: fallbackQuestion.type,
    currentQuestionLevel: fallbackQuestion.level,
    currentQuestionIs18Plus: fallbackQuestion.is18Plus,
    currentQuestionIsCustom: false,
  };
}

export async function buildCompletedSessionSummary(
  prisma: DbClient,
  sessionId: string,
): Promise<SessionCompletionSummary | null> {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    select: {
      roundCount: true,
      totalDrinks: true,
      room: {
        select: {
          players: {
            orderBy: { joinedAt: "asc" },
            select: {
              id: true,
              name: true,
              drinkCount: true,
            },
          },
        },
      },
      events: {
        where: {
          type: {
            not: GameEventType.COMPLETED,
          },
        },
        select: {
          playerId: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  const turnCounts = new Map<string, number>();
  for (const event of session.events) {
    turnCounts.set(event.playerId, (turnCounts.get(event.playerId) ?? 0) + 1);
  }

  return {
    totalRounds: session.roundCount,
    totalDrinks: session.totalDrinks,
    players: session.room.players.map((player) => ({
      id: player.id,
      name: player.name,
      drinkCount: player.drinkCount,
      questionsAnswered: turnCounts.get(player.id) ?? 0,
    })),
  };
}

export async function attachPendingRoomQuestionsToSession(
  prisma: DbClient,
  roomId: string,
  sessionId: string,
): Promise<void> {
  await prisma.roomQuestion.updateMany({
    where: {
      roomId,
      sessionId: null,
    },
    data: {
      sessionId,
    },
  });
}

export function buildProgressEventData(input: {
  customQuestionId?: string | null;
  roundNumber: number;
  drinkDelta: number;
}): string {
  return JSON.stringify({
    roundNumber: input.roundNumber,
    drinkDelta: input.drinkDelta,
    ...(input.customQuestionId ? { customQuestionId: input.customQuestionId } : {}),
  });
}

export const GAME_SESSION_STATE_SELECT = SESSION_STATE_SELECT;

import {
  GameEventType,
  Prisma,
  type PrismaClient,
  QuestionType,
} from "@prisma/client";
import { randomUUID } from "node:crypto";
import { isUniqueConstraintError } from "@/backend/prismaRetry";

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
  currentTurnToken: true,
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
  currentTurnToken: string | null;
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
  currentTurnToken: string | null;
};

type SessionTurnHydrationCandidate = {
  status: string;
  currentPlayerId?: string | null;
  currentQuestionText?: string | null;
  currentQuestionType?: string | null;
  currentTurnToken?: string | null;
};

type ProgressRequestInput = {
  roomId: string;
  sessionId: string;
  action: GameEventType;
  drinkDelta: number;
  turnToken: string;
  requestId: string;
};

export type ProgressWriteResult =
  | { kind: "not_found" }
  | { kind: "closed"; session: SessionStateSnapshot }
  | { kind: "invalid_state"; session: SessionStateSnapshot }
  | { kind: "stale"; session: SessionStateSnapshot }
  | { kind: "duplicate"; session: SessionStateSnapshot }
  | { kind: "updated"; session: SessionStateSnapshot };

function createTurnToken(): string {
  return randomUUID();
}

function hasAuthoritativeTurn(
  session: SessionTurnHydrationCandidate | null | undefined,
): boolean {
  return Boolean(
    session?.currentPlayerId &&
      session.currentQuestionText &&
      session.currentQuestionType &&
      session.currentTurnToken,
  );
}

async function getSessionStateById(
  prisma: DbClient,
  sessionId: string,
): Promise<SessionStateSnapshot | null> {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    select: SESSION_STATE_SELECT,
  });

  return toSessionStateSnapshot(session);
}

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
    currentTurnToken: session.currentTurnToken ?? null,
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
    !session.currentQuestionType ||
    !session.currentTurnToken
  );
}

export async function chooseNextSessionState(
  prisma: DbClient,
  sessionId: string,
  completedRoundIncrement = 0,
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
      currentTurnToken: null,
    };
  }

  const effectiveRoundCount = session.roundCount + completedRoundIncrement;
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
      currentTurnToken: null,
    };
  }

  const currentPlayerId =
    playerIds[effectiveRoundCount % playerIds.length] ?? null;
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
    effectiveRoundCount,
  );
  const shouldPreferCustom =
    availableCustomQuestions.length > 0 &&
    shouldUseCustomQuestion(session.mode, effectiveRoundCount);

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
      currentTurnToken: createTurnToken(),
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
        currentTurnToken: createTurnToken(),
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
      currentTurnToken: createTurnToken(),
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
    currentTurnToken: createTurnToken(),
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

export async function writeAuthoritativeProgress(
  prisma: DbClient,
  input: ProgressRequestInput,
): Promise<ProgressWriteResult> {
  const session = await prisma.gameSession.findFirst({
    where: {
      id: input.sessionId,
      roomId: input.roomId,
    },
    select: SESSION_STATE_SELECT,
  });

  const sessionSnapshot = toSessionStateSnapshot(session);
  if (!sessionSnapshot) {
    return { kind: "not_found" };
  }

  const duplicateRequest = await prisma.gameEvent.findFirst({
    where: {
      sessionId: input.sessionId,
      requestId: input.requestId,
    },
    select: { id: true },
  });

  if (duplicateRequest) {
    return { kind: "duplicate", session: sessionSnapshot };
  }

  if (sessionSnapshot.status !== "ACTIVE") {
    return { kind: "closed", session: sessionSnapshot };
  }

  if (!hasAuthoritativeTurn(sessionSnapshot)) {
    return { kind: "invalid_state", session: sessionSnapshot };
  }

  if (sessionSnapshot.currentTurnToken !== input.turnToken) {
    return { kind: "stale", session: sessionSnapshot };
  }

  const nextRoundNumber = sessionSnapshot.roundCount + 1;
  const eventData = buildProgressEventData({
    customQuestionId: sessionSnapshot.currentQuestionIsCustom
      ? sessionSnapshot.currentQuestionId
      : null,
    roundNumber: nextRoundNumber,
    drinkDelta: input.drinkDelta,
  });

  try {
    await prisma.gameEvent.create({
      data: {
        sessionId: sessionSnapshot.id,
        playerId: sessionSnapshot.currentPlayerId!,
        questionId: sessionSnapshot.currentQuestionIsCustom
          ? null
          : sessionSnapshot.currentQuestionId ?? null,
        type: input.action,
        turnToken: input.turnToken,
        requestId: input.requestId,
        data: eventData,
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const latestSession = await getSessionStateById(prisma, input.sessionId);
    if (!latestSession) {
      return { kind: "not_found" };
    }

    const sameRequest = await prisma.gameEvent.findFirst({
      where: {
        sessionId: input.sessionId,
        requestId: input.requestId,
      },
      select: { id: true },
    });

    return sameRequest
      ? { kind: "duplicate", session: latestSession }
      : { kind: "stale", session: latestSession };
  }

  if (!sessionSnapshot.currentQuestionIsCustom && sessionSnapshot.currentQuestionId) {
    await prisma.question.update({
      where: { id: sessionSnapshot.currentQuestionId },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    });
  }

  if (input.drinkDelta > 0) {
    await prisma.player.update({
      where: { id: sessionSnapshot.currentPlayerId! },
      data: {
        drinkCount: {
          increment: input.drinkDelta,
        },
        skipCount: {
          increment: 1,
        },
      },
    });
  }

  const nextState = await chooseNextSessionState(prisma, sessionSnapshot.id, 1);
  const updatedSession = await prisma.gameSession.update({
    where: { id: sessionSnapshot.id },
    data: {
      roundCount: { increment: 1 },
      totalDrinks: { increment: input.drinkDelta },
      durationMs: Math.max(
        sessionSnapshot.durationMs,
        Date.now() - sessionSnapshot.startedAt.getTime(),
      ),
      ...nextState,
    },
    select: SESSION_STATE_SELECT,
  });

  return {
    kind: "updated",
    session: toSessionStateSnapshot(updatedSession)!,
  };
}

export const GAME_SESSION_STATE_SELECT = SESSION_STATE_SELECT;

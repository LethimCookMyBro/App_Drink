import {
  GameEventType,
  Prisma,
  type PrismaClient,
  QuestionType,
} from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { isUniqueConstraintError } from "@/backend/prismaRetry";
import { GAME_SETTINGS } from "@/shared/config/gameConstants";

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
  currentTurnStartedAt: true,
  currentTurnExpiresAt: true,
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
  currentTurnStartedAt: Date | null;
  currentTurnExpiresAt: Date | null;
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

type SessionChoice = {
  currentPlayerId: string | null;
  currentQuestionId: string | null;
  currentQuestionText: string | null;
  currentQuestionType: QuestionType | null;
  currentQuestionLevel: number | null;
  currentQuestionIs18Plus: boolean;
  currentQuestionIsCustom: boolean;
  currentTurnToken: string | null;
  currentTurnStartedAt: Date | null;
  currentTurnExpiresAt: Date | null;
};

type SessionTurnHydrationCandidate = {
  status: string;
  currentPlayerId?: string | null;
  currentQuestionText?: string | null;
  currentQuestionType?: string | null;
  currentTurnToken?: string | null;
  currentTurnStartedAt?: Date | null;
  currentTurnExpiresAt?: Date | null;
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

const TURN_DURATION_MS = GAME_SETTINGS.defaultTimerDuration * 1000;

function createTurnToken(): string {
  return randomUUID();
}

function createTurnTiming(now = new Date()) {
  return {
    currentTurnStartedAt: now,
    currentTurnExpiresAt: new Date(now.getTime() + TURN_DURATION_MS),
  };
}

function hasAuthoritativeTurn(
  session: SessionTurnHydrationCandidate | null | undefined,
): boolean {
  return Boolean(
    session?.currentPlayerId &&
      session.currentQuestionText &&
      session.currentQuestionType &&
      session.currentTurnToken &&
      session.currentTurnStartedAt &&
      session.currentTurnExpiresAt,
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

export function getAllowedQuestionTypes(mode: string): QuestionType[] {
  switch (mode) {
    case "QUESTION":
      return [QuestionType.QUESTION];
    case "VOTE":
      return [QuestionType.VOTE];
    case "CHAOS":
      return [QuestionType.CHAOS];
    case "TRUTH_OR_DARE":
      return [QuestionType.TRUTH, QuestionType.DARE];
    default:
      return [...MIXED_MODE_ROTATION];
  }
}

export const MAX_QUESTION_LEVEL = 3;

export function getEffectiveQuestionDifficulty(
  roomDifficulty: number,
): number {
  return Math.min(MAX_QUESTION_LEVEL, Math.max(1, roomDifficulty));
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

const QUESTION_FIELDS_SELECT = {
  id: true,
  text: true,
  type: true,
  level: true,
  is18Plus: true,
} satisfies Prisma.QuestionSelect;

type QuestionFieldsPayload = Prisma.QuestionGetPayload<{
  select: typeof QUESTION_FIELDS_SELECT;
}>;

const QUESTION_ORDER_BY: Prisma.QuestionOrderByWithRelationInput[] = [
  { usageCount: "asc" },
  { updatedAt: "asc" },
  { createdAt: "asc" },
];

async function pickLeastUsedQuestion(
  prisma: DbClient,
  where: Prisma.QuestionWhereInput,
): Promise<QuestionFieldsPayload | null> {
  return prisma.question.findFirst({
    where,
    orderBy: QUESTION_ORDER_BY,
    select: QUESTION_FIELDS_SELECT,
  });
}

function seededShuffle<T>(items: T[], seed: string): T[] {
  const hash = createHash("sha256").update(seed).digest();
  let state = hash.readUInt32LE(0) || 1;
  const rand = () => {
    state |= 0; state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function resolveShuffledCycle(
  playerIds: string[],
  sessionId: string,
  cycleIndex: number,
): string[] {
  const cycleLength = playerIds.length;
  let shuffledForCycle = seededShuffle(playerIds, `${sessionId}:${cycleIndex}`);

  if (cycleIndex > 0 && cycleLength > 1) {
    const previousCycleLast = resolveShuffledCycle(
      playerIds,
      sessionId,
      cycleIndex - 1,
    )[cycleLength - 1];
    let attempt = 1;
    while (
      shuffledForCycle[0] === previousCycleLast &&
      attempt <= cycleLength
    ) {
      shuffledForCycle = seededShuffle(
        playerIds,
        `${sessionId}:${cycleIndex}:${attempt}`,
      );
      attempt += 1;
    }
  }

  return shuffledForCycle;
}

export function selectPlayerForRound(
  playerIds: string[],
  sessionId: string,
  effectiveRoundCount: number,
): string | null {
  const cycleLength = playerIds.length;
  if (cycleLength === 0) {
    return null;
  }

  const cycleIndex = Math.floor(effectiveRoundCount / cycleLength);
  const positionInCycle = effectiveRoundCount % cycleLength;

  return resolveShuffledCycle(playerIds, sessionId, cycleIndex)[
    positionInCycle
  ] ?? null;
}

function toStandardQuestionChoice(
  currentPlayerId: string | null,
  question: QuestionFieldsPayload,
): SessionChoice {
  return {
    currentPlayerId,
    currentQuestionId: question.id,
    currentQuestionText: question.text,
    currentQuestionType: question.type,
    currentQuestionLevel: question.level,
    currentQuestionIs18Plus: question.is18Plus,
    currentQuestionIsCustom: false,
    currentTurnToken: createTurnToken(),
    ...createTurnTiming(),
  };
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
    currentTurnStartedAt: session.currentTurnStartedAt ?? null,
    currentTurnExpiresAt: session.currentTurnExpiresAt ?? null,
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
    !session.currentTurnToken ||
    !session.currentTurnStartedAt ||
    !session.currentTurnExpiresAt
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
      currentQuestionId: true,
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
      currentTurnStartedAt: null,
      currentTurnExpiresAt: null,
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
      currentTurnStartedAt: null,
      currentTurnExpiresAt: null,
    };
  }

  const currentPlayerId = selectPlayerForRound(
    playerIds,
    sessionId,
    effectiveRoundCount,
  );

  // Optimized: Load only IDs of used questions instead of full events
  const [usedQuestionRows, customQuestionEventRows] = await Promise.all([
    prisma.gameEvent.findMany({
      where: {
        sessionId,
        questionId: { not: null },
      },
      select: { questionId: true },
    }),
    prisma.gameEvent.findMany({
      where: {
        sessionId,
        questionId: null,
        data: { contains: "customQuestionId" },
      },
      select: { data: true },
    }),
  ]);

  const usedQuestionIds = new Set(
    usedQuestionRows.map((row) => row.questionId as string),
  );
  const usedCustomQuestionIds = new Set(
    customQuestionEventRows
      .map((row) => tryParseCustomQuestionId(row.data))
      .filter((id): id is string => id !== null),
  );

  const allowedTypes = getAllowedQuestionTypes(session.mode);
  const effectiveDifficulty = getEffectiveQuestionDifficulty(
    session.room.difficulty,
  );
  const allowedTypeSet = new Set(allowedTypes);
  const availableCustomQuestions = session.room.questions.filter(
    (question) =>
      allowedTypeSet.has(question.type as QuestionType) &&
      !usedCustomQuestionIds.has(question.id) &&
      question.level <= effectiveDifficulty &&
      (session.room.is18Plus || !question.is18Plus),
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
      ...createTurnTiming(),
    };
  }

  const baseWhere = {
    isActive: true,
    isPublic: true,
    level: { lte: effectiveDifficulty },
    ...(session.room.is18Plus ? {} : { is18Plus: false }),
    type: { in: allowedTypes },
  } satisfies Prisma.QuestionWhereInput;

  const unusedOnlyWhere = {
    ...baseWhere,
    ...(usedQuestionIds.size > 0
      ? { id: { notIn: Array.from(usedQuestionIds) } }
      : {}),
  } satisfies Prisma.QuestionWhereInput;

  for (const questionType of preferredTypes) {
    const question = await pickLeastUsedQuestion(prisma, {
      ...unusedOnlyWhere,
      type: questionType,
    });

    if (question) {
      return toStandardQuestionChoice(currentPlayerId, question);
    }
  }

  const fallbackQuestion = await pickLeastUsedQuestion(prisma, unusedOnlyWhere);

  if (!fallbackQuestion) {
    const recycleExcludingCurrentWhere = {
      ...baseWhere,
      ...(session.currentQuestionId
        ? { id: { notIn: [session.currentQuestionId] } }
        : {}),
    } satisfies Prisma.QuestionWhereInput;

    const recycledQuestion =
      (await pickLeastUsedQuestion(prisma, recycleExcludingCurrentWhere)) ??
      (session.currentQuestionId
        ? await pickLeastUsedQuestion(prisma, baseWhere)
        : null);

    if (recycledQuestion) {
      return toStandardQuestionChoice(currentPlayerId, recycledQuestion);
    }

    return {
      currentPlayerId,
      currentQuestionId: null,
      currentQuestionText: "ยังไม่มีคำถามพร้อมใช้งาน",
      currentQuestionType: QuestionType.QUESTION,
      currentQuestionLevel: 1,
      currentQuestionIs18Plus: false,
      currentQuestionIsCustom: false,
      currentTurnToken: createTurnToken(),
      ...createTurnTiming(),
    };
  }

  return toStandardQuestionChoice(currentPlayerId, fallbackQuestion);
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

  // NOTE: The turn timer is a non-blocking gameplay timer. Players may answer,
  // complete, skip, or advance to the next turn before it expires. When the
  // timer expires, clients trigger the timeout action (skip) which is
  // idempotent: duplicate/stale requests are rejected by turnToken/requestId.

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
        ...(input.action === GameEventType.SKIPPED
          ? {
              skipCount: {
                increment: 1,
              },
            }
          : {}),
      },
    });
  } else if (input.action === GameEventType.SKIPPED) {
    await prisma.player.update({
      where: { id: sessionSnapshot.currentPlayerId! },
      data: {
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

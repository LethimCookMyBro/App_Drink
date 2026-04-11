import { redactPotentialPII } from "@/backend/dataProtection";
import { maskContact } from "@/backend/privacy";

const SENSITIVE_RESPONSE_KEYS = new Set([
  "password",
  "token",
  "sessionToken",
  "refresh_token",
  "access_token",
  "id_token",
  "session_state",
]);

export function filterApiResponse<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => filterApiResponse(entry)) as T;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const sanitizedEntries = Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !SENSITIVE_RESPONSE_KEYS.has(key))
    .map(([key, nestedValue]) => [key, filterApiResponse(nestedValue)]);

  return Object.fromEntries(sanitizedEntries) as T;
}

export function toPublicQuestion(question: {
  id: string;
  text: string;
  type: string;
  level: number;
  is18Plus: boolean;
}) {
  return {
    id: question.id,
    text: question.text,
    type: question.type,
    level: question.level,
    is18Plus: question.is18Plus,
  };
}

export function toAdminQuestion(question: {
  id: string;
  text: string;
  type: string;
  level: number;
  is18Plus: boolean;
  isPublic?: boolean;
  isActive?: boolean;
  usageCount?: number;
}) {
  return {
    id: question.id,
    text: question.text,
    type: question.type,
    level: question.level,
    is18Plus: question.is18Plus,
    ...(typeof question.isPublic === "boolean" ? { isPublic: question.isPublic } : {}),
    ...(typeof question.isActive === "boolean" ? { isActive: question.isActive } : {}),
    ...(typeof question.usageCount === "number" ? { usageCount: question.usageCount } : {}),
  };
}

export function toRoomPlayer(player: {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  drinkCount?: number;
  skipCount?: number;
}) {
  return {
    id: player.id,
    name: player.name,
    isHost: player.isHost,
    isReady: player.isReady,
    ...(typeof player.drinkCount === "number"
      ? { drinkCount: player.drinkCount }
      : {}),
    ...(typeof player.skipCount === "number"
      ? { skipCount: player.skipCount }
      : {}),
  };
}

export function toRoomQuestion(question: {
  id: string;
  sessionId?: string | null;
  text: string;
  type: string;
  level: number;
  is18Plus: boolean;
  createdAt?: Date;
}) {
  return {
    id: question.id,
    sessionId: question.sessionId ?? null,
    text: question.text,
    type: question.type,
    level: question.level,
    is18Plus: question.is18Plus,
    ...(question.createdAt ? { createdAt: question.createdAt } : {}),
  };
}

export function toGameSessionSummary(session: {
  id: string;
  mode: string;
  status: string;
  resumePath?: string | null;
  roundCount: number;
  totalDrinks: number;
  currentPlayerId?: string | null;
  currentQuestionId?: string | null;
  currentQuestionText?: string | null;
  currentQuestionType?: string | null;
  currentQuestionLevel?: number | null;
  currentQuestionIs18Plus?: boolean;
  currentQuestionIsCustom?: boolean;
  currentTurnToken?: string | null;
  startedAt: Date;
  endedAt?: Date | null;
}) {
  return {
    id: session.id,
    mode: session.mode,
    status: session.status,
    resumePath: session.resumePath ?? null,
    roundCount: session.roundCount,
    totalDrinks: session.totalDrinks,
    currentPlayerId: session.currentPlayerId ?? null,
    currentQuestionId: session.currentQuestionId ?? null,
    currentQuestionText: session.currentQuestionText ?? null,
    currentQuestionType: session.currentQuestionType ?? null,
    currentQuestionLevel: session.currentQuestionLevel ?? null,
    currentQuestionIs18Plus: session.currentQuestionIs18Plus ?? false,
    currentQuestionIsCustom: session.currentQuestionIsCustom ?? false,
    currentTurnToken: session.currentTurnToken ?? null,
    startedAt: session.startedAt,
    endedAt: session.endedAt ?? null,
  };
}

export function toRoomSummary(room: {
  code: string;
  name: string;
  maxPlayers: number;
  difficulty?: number;
  is18Plus?: boolean;
  isActive?: boolean;
  players: Array<{
    id: string;
    name: string;
    isHost: boolean;
    isReady: boolean;
    drinkCount?: number;
    skipCount?: number;
  }>;
  questions?: Array<{
    id: string;
    sessionId?: string | null;
    text: string;
    type: string;
    level: number;
    is18Plus: boolean;
    createdAt?: Date;
  }>;
  sessions?: Array<Parameters<typeof toGameSessionSummary>[0]>;
}) {
  const activeSession = room.sessions?.[0]
    ? toGameSessionSummary(room.sessions[0])
    : null;
  const customQuestions = room.questions?.filter((question) => {
    if (!activeSession) {
      return !question.sessionId;
    }

    return question.sessionId === activeSession.id;
  }) ?? [];

  return {
    code: room.code,
    name: room.name,
    maxPlayers: room.maxPlayers,
    ...(typeof room.difficulty === "number" ? { difficulty: room.difficulty } : {}),
    ...(typeof room.is18Plus === "boolean" ? { is18Plus: room.is18Plus } : {}),
    ...(typeof room.isActive === "boolean" ? { isActive: room.isActive } : {}),
    players: room.players.map(toRoomPlayer),
    ...(room.questions ? { customQuestions: customQuestions.map(toRoomQuestion) } : {}),
    ...(room.sessions ? { activeSession } : {}),
  };
}

export function toFeedbackResponse(feedback: {
  id: string;
  type: string;
  title: string;
  details: string | null;
  contact: string | null;
  status: string;
  createdAt: Date;
  resolvedAt?: Date | null;
}) {
  return {
    id: feedback.id,
    type: feedback.type,
    title: redactPotentialPII(feedback.title) || feedback.title,
    details: redactPotentialPII(feedback.details),
    contactMasked: maskContact(feedback.contact),
    hasContact: Boolean(feedback.contact),
    status: feedback.status,
    createdAt: feedback.createdAt,
    ...(feedback.resolvedAt !== undefined ? { resolvedAt: feedback.resolvedAt } : {}),
  };
}

export default filterApiResponse;

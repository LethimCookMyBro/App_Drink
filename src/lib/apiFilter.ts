import { redactPotentialPII } from "@/lib/dataProtection";
import { maskContact } from "@/lib/privacy";

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
}) {
  return {
    id: player.id,
    name: player.name,
    isHost: player.isHost,
    isReady: player.isReady,
  };
}

export function toRoomSummary(room: {
  code: string;
  name: string;
  maxPlayers: number;
  isActive?: boolean;
  players: Array<{
    id: string;
    name: string;
    isHost: boolean;
    isReady: boolean;
  }>;
}) {
  return {
    code: room.code,
    name: room.name,
    maxPlayers: room.maxPlayers,
    ...(typeof room.isActive === "boolean" ? { isActive: room.isActive } : {}),
    players: room.players.map(toRoomPlayer),
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

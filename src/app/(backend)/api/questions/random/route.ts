import { NextRequest } from "next/server";
import type { PrismaClient } from "@prisma/client";
import { toPublicQuestion } from "@/backend/apiFilter";
import { enforceRateLimit, jsonError, jsonOk } from "@/backend/apiUtils";
import logger from "@/backend/logger";
import { rateLimitConfigs } from "@/backend/rateLimit";
import {
  verifyRoomHostToken,
  verifyRoomPlayerToken,
  type RoomHostTokenPayload,
  type RoomPlayerTokenPayload,
} from "@/backend/roomAuth";
import { GAME_QUESTION_TYPE_SET } from "@/shared/config/gameConstants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pickRandomSubset<T>(items: T[], count: number): T[] {
  const shuffled = [...items];
  const selectionCount = Math.min(count, shuffled.length);

  for (let index = 0; index < selectionCount; index += 1) {
    const randomIndex =
      index + Math.floor(Math.random() * (shuffled.length - index));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled.slice(0, selectionCount);
}

function parseBoundedInt(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function parseOptionalLevel(value: string | null): number | null {
  if (!value) {
    return null;
  }

  return parseBoundedInt(value, 1, 1, 3);
}

type RoomAdultAccessToken =
  | { kind: "host"; payload: RoomHostTokenPayload }
  | { kind: "player"; payload: RoomPlayerTokenPayload };

function getRoomAdultAccessTokens(request: NextRequest): RoomAdultAccessToken[] {
  const tokens: RoomAdultAccessToken[] = [];

  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("room-host-")) {
      const payload = verifyRoomHostToken(cookie.value);
      if (payload) {
        tokens.push({ kind: "host", payload });
      }
      continue;
    }

    if (cookie.name.startsWith("room-player-")) {
      const payload = verifyRoomPlayerToken(cookie.value);
      if (payload) {
        tokens.push({ kind: "player", payload });
      }
    }
  }

  return tokens;
}

async function hasServerSideAdultQuestionAccess(
  prisma: Pick<PrismaClient, "room">,
  request: NextRequest,
): Promise<boolean> {
  const tokens = getRoomAdultAccessTokens(request);
  for (const token of tokens) {
    const room = await prisma.room.findFirst({
      where: {
        id: token.payload.roomId,
        code: token.payload.code,
        isActive: true,
        ...(token.kind === "host"
          ? { hostId: token.payload.hostId }
          : { players: { some: { id: token.payload.playerId } } }),
      },
      select: { is18Plus: true },
    });

    if (room?.is18Plus) {
      return true;
    }
  }

  return false;
}

// GET /api/questions/random - Get random question(s) for gameplay
export async function GET(request: NextRequest) {
  const rateLimited = enforceRateLimit(request, rateLimitConfigs.randomQuestion);
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const count = parseBoundedInt(searchParams.get("count"), 1, 1, 10);
  const level = parseOptionalLevel(searchParams.get("level"));
  const excludeIds =
    searchParams
      .get("exclude")
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean) ?? [];

  if (type && !GAME_QUESTION_TYPE_SET.has(type)) {
    return jsonError("ประเภทคำถามไม่ถูกต้อง", 400);
  }

  try {
    const { default: prisma } = await import("@/backend/db");
    const canAccessAdultQuestions = await hasServerSideAdultQuestionAccess(
      prisma,
      request,
    );

    const where: Record<string, unknown> = {
      isActive: true,
      isPublic: true,
    };
    if (type) {
      where.type = type;
    }
    if (level !== null) {
      where.level = { lte: level };
    }
    if (!canAccessAdultQuestions) {
      where.is18Plus = false;
    }
    if (excludeIds.length > 0) {
      where.id = { notIn: excludeIds };
    }

    const candidateLimit = Math.min(120, Math.max(count * 8, 24));
    const candidates = await prisma.question.findMany({
      where,
      orderBy: [{ usageCount: "asc" }, { updatedAt: "asc" }, { id: "asc" }],
      take: candidateLimit,
      select: {
        id: true,
        text: true,
        type: true,
        level: true,
        is18Plus: true,
      },
    });

    if (candidates.length === 0) {
      return jsonOk({
        questions: [],
        count: 0,
        source: "db",
        message: "No questions found matching criteria",
      });
    }

    const selectedQuestions = pickRandomSubset(candidates, count);
    const selectedIds = selectedQuestions.map((question) => question.id);

    if (selectedIds.length > 0) {
      await prisma.question.updateMany({
        where: {
          id: {
            in: selectedIds,
          },
        },
        data: {
          usageCount: {
            increment: 1,
          },
        },
      });
    }

    return jsonOk({
      questions: selectedQuestions.map(toPublicQuestion),
      count: selectedQuestions.length,
      source: "db",
    });
  } catch (error) {
    logger.error("questions.random.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return jsonError("ไม่สามารถโหลดคำถามได้ในขณะนี้", 500);
  }
}

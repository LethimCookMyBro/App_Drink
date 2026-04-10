import { NextRequest } from "next/server";
import {
  enforceRateLimit,
  enforceSameOrigin,
  jsonError,
  jsonOk,
  mapServerError,
} from "@/lib/apiUtils";
import logger from "@/lib/logger";
import { rateLimitConfigs } from "@/lib/rateLimit";
import {
  getRoomHostPayloadFromCookies,
  getRoomPlayerPayloadFromCookies,
} from "@/lib/roomAuth";
import { roomCodeSchema, roomCompleteSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const rateLimited = enforceRateLimit(request, rateLimitConfigs.roomMutation);
    if (rateLimited) return rateLimited;

    const { code } = await params;
    const roomCode = code.toUpperCase();
    const codeValidation = roomCodeSchema.safeParse(roomCode);
    if (!codeValidation.success) {
      return jsonError("รหัสห้องไม่ถูกต้อง", 400);
    }

    const body = await request.json().catch(() => ({}));
    const bodyValidation = roomCompleteSchema.safeParse({
      sessionId: body?.sessionId,
    });
    if (!bodyValidation.success) {
      return jsonError(
        bodyValidation.error.issues[0]?.message || "session ไม่ถูกต้อง",
        400,
      );
    }
    const { sessionId } = bodyValidation.data;

    const hostPayload = await getRoomHostPayloadFromCookies(roomCode);
    const playerPayload = await getRoomPlayerPayloadFromCookies(roomCode);
    if (!hostPayload && !playerPayload) {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 401);
    }

    const { default: prisma } = await import("@/lib/db");
    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      select: {
        id: true,
        hostId: true,
        players: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!room) {
      return jsonError("ไม่พบห้อง", 404);
    }

    const hostAuthorized =
      !!hostPayload &&
      hostPayload.code === roomCode &&
      hostPayload.roomId === room.id &&
      hostPayload.hostId === room.hostId;
    const playerAuthorized =
      !!playerPayload &&
      playerPayload.code === roomCode &&
      playerPayload.roomId === room.id &&
      room.players.some((player) => player.id === playerPayload.playerId);

    if (!hostAuthorized && !playerAuthorized) {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 403);
    }

    const existingSession = await prisma.gameSession.findFirst({
      where: {
        id: sessionId,
        roomId: room.id,
      },
      select: {
        id: true,
        status: true,
        roundCount: true,
        totalDrinks: true,
        mode: true,
        startedAt: true,
        endedAt: true,
      },
    });

    if (!existingSession) {
      return jsonError("ไม่พบ session ที่กำลังเล่นอยู่", 404);
    }

    if (existingSession.status === "COMPLETED") {
      return jsonOk({
        success: true,
        sessionId: existingSession.id,
        session: existingSession,
      });
    }

    const completedSession = await prisma.gameSession.update({
      where: { id: existingSession.id },
      data: {
        status: "COMPLETED",
        endedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        roundCount: true,
        totalDrinks: true,
        mode: true,
        startedAt: true,
        endedAt: true,
      },
    });

    return jsonOk({
      success: true,
      sessionId: completedSession.id,
      session: completedSession,
    });
  } catch (error) {
    logger.error("rooms.complete.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "ไม่สามารถจบเกมได้ในขณะนี้");
  }
}

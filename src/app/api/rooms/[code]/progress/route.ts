import { Prisma } from "@prisma/client";
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
import { roomCodeSchema, roomProgressSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function canRetrySerializable(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

async function withSerializableRetry<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0;

  while (attempt < 4) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;
      if (!canRetrySerializable(error) || attempt >= 4) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 15 * 2 ** attempt));
    }
  }

  throw new Error("Could not persist round progress");
}

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
    const bodyValidation = roomProgressSchema.safeParse({
      sessionId: body?.sessionId,
      roundNumber: body?.roundNumber,
      drinkDelta: body?.drinkDelta,
    });
    if (!bodyValidation.success) {
      return jsonError(
        bodyValidation.error.issues[0]?.message || "ข้อมูลความคืบหน้าเกมไม่ถูกต้อง",
        400,
      );
    }

    const { sessionId, roundNumber, drinkDelta } = bodyValidation.data;

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

    const result = await withSerializableRetry(async () =>
      prisma.$transaction(
        async (tx) => {
          const session = await tx.gameSession.findFirst({
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

          if (!session) {
            return { kind: "not_found" as const };
          }

          if (session.status !== "ACTIVE") {
            if (roundNumber <= session.roundCount) {
              return { kind: "noop" as const, session };
            }

            return { kind: "closed" as const, session };
          }

          if (roundNumber <= session.roundCount) {
            return { kind: "noop" as const, session };
          }

          if (roundNumber !== session.roundCount + 1) {
            return { kind: "out_of_sequence" as const, session };
          }

          const updatedSession = await tx.gameSession.update({
            where: { id: session.id },
            data: {
              roundCount: { increment: 1 },
              totalDrinks: { increment: drinkDelta },
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

          return { kind: "updated" as const, session: updatedSession };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      ),
    );

    if (result.kind === "not_found") {
      return jsonError("ไม่พบ session ที่กำลังเล่นอยู่", 404);
    }

    if (result.kind === "closed") {
      return jsonError("session นี้จบแล้ว", 409, {
        currentRoundCount: result.session.roundCount,
      });
    }

    if (result.kind === "out_of_sequence") {
      return jsonError("ลำดับรอบเกมไม่ถูกต้อง", 409, {
        currentRoundCount: result.session.roundCount,
      });
    }

    return jsonOk({
      success: true,
      sessionId: result.session.id,
      session: result.session,
    });
  } catch (error) {
    logger.error("rooms.progress.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "ไม่สามารถบันทึกความคืบหน้าเกมได้ในขณะนี้");
  }
}

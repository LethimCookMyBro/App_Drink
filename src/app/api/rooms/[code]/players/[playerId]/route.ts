import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { toRoomSummary } from "@/lib/apiFilter";
import {
  enforceRateLimit,
  enforceSameOrigin,
  jsonError,
  jsonOk,
  mapServerError,
} from "@/lib/apiUtils";
import logger from "@/lib/logger";
import { rateLimitConfigs } from "@/lib/rateLimit";
import { getRoomHostPayloadFromCookies } from "@/lib/roomAuth";
import { roomCodeSchema } from "@/lib/schemas";

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

  throw new Error("Could not remove player");
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ code: string; playerId: string }> },
) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const rateLimited = enforceRateLimit(request, rateLimitConfigs.roomMutation);
    if (rateLimited) return rateLimited;

    const { code, playerId } = await params;
    const roomCode = code.toUpperCase();
    const codeValidation = roomCodeSchema.safeParse(roomCode);
    if (!codeValidation.success) {
      return jsonError("รหัสห้องไม่ถูกต้อง", 400);
    }

    const normalizedPlayerId = typeof playerId === "string" ? playerId.trim() : "";
    if (normalizedPlayerId.length < 10) {
      return jsonError("ผู้เล่นไม่ถูกต้อง", 400);
    }

    const payload = await getRoomHostPayloadFromCookies(roomCode);
    if (!payload || payload.code !== roomCode) {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 401);
    }

    const { default: prisma } = await import("@/lib/db");
    const result = await withSerializableRetry(async () =>
      prisma.$transaction(
        async (tx) => {
          const room = await tx.room.findUnique({
            where: { code: roomCode },
            select: {
              id: true,
              code: true,
              name: true,
              hostId: true,
              maxPlayers: true,
              isActive: true,
            },
          });

          if (!room) {
            return { kind: "not_found" as const };
          }

          if (!room.isActive) {
            return { kind: "inactive" as const };
          }

          if (room.id !== payload.roomId || room.hostId !== payload.hostId) {
            return { kind: "forbidden" as const };
          }

          const player = await tx.player.findFirst({
            where: {
              id: normalizedPlayerId,
              roomId: room.id,
            },
            select: {
              id: true,
              isHost: true,
            },
          });

          if (!player) {
            return { kind: "player_not_found" as const };
          }

          if (player.isHost) {
            return { kind: "cannot_remove_host" as const };
          }

          await tx.player.delete({
            where: { id: player.id },
          });

          const updatedRoom = await tx.room.findUnique({
            where: { id: room.id },
            select: {
              code: true,
              name: true,
              maxPlayers: true,
              isActive: true,
              players: {
                orderBy: { joinedAt: "asc" },
                select: {
                  id: true,
                  name: true,
                  isHost: true,
                  isReady: true,
                },
              },
            },
          });

          return {
            kind: "removed" as const,
            room: updatedRoom,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      ),
    );

    if (result.kind === "not_found") {
      return jsonError("ไม่พบห้อง", 404);
    }

    if (result.kind === "inactive") {
      return jsonError("ห้องนี้ถูกปิดแล้ว", 410);
    }

    if (result.kind === "forbidden") {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 403);
    }

    if (result.kind === "player_not_found") {
      return jsonError("ไม่พบผู้เล่นในห้องนี้", 404);
    }

    if (result.kind === "cannot_remove_host") {
      return jsonError("ไม่สามารถลบเจ้าของวงได้", 409);
    }

    if (!result.room) {
      return jsonError("ไม่สามารถอัปเดตรายชื่อผู้เล่นได้", 500);
    }

    return jsonOk({
      room: toRoomSummary(result.room),
      canManageLobby: true,
    });
  } catch (error) {
    logger.error("rooms.players.delete.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "ไม่สามารถลบผู้เล่นได้ในขณะนี้");
  }
}

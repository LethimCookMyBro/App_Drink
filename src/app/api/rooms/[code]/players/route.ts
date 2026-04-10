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
import { roomCodeSchema, roomHostPlayerSchema } from "@/lib/schemas";

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

  throw new Error("Could not add player");
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

    const payload = await getRoomHostPayloadFromCookies(roomCode);
    if (!payload || payload.code !== roomCode) {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 401);
    }

    const body = await request.json().catch(() => ({}));
    const validation = roomHostPlayerSchema.safeParse({
      playerName: body?.playerName,
    });
    if (!validation.success) {
      return jsonError(
        validation.error.issues[0]?.message || "ชื่อผู้เล่นไม่ถูกต้อง",
        400,
      );
    }

    const { playerName } = validation.data;
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

          const [playerCount, duplicatePlayer] = await Promise.all([
            tx.player.count({
              where: { roomId: room.id },
            }),
            tx.player.findFirst({
              where: {
                roomId: room.id,
                name: {
                  equals: playerName,
                  mode: "insensitive",
                },
              },
              select: { id: true },
            }),
          ]);

          if (playerCount >= room.maxPlayers) {
            return { kind: "full" as const };
          }

          if (duplicatePlayer) {
            return { kind: "name_taken" as const };
          }

          await tx.player.create({
            data: {
              name: playerName,
              roomId: room.id,
              isHost: false,
              isReady: true,
            },
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
            kind: "created" as const,
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

    if (result.kind === "full") {
      return jsonError("ห้องเต็มแล้ว", 409);
    }

    if (result.kind === "name_taken") {
      return jsonError("ชื่อนี้ถูกใช้แล้วในห้องนี้", 409);
    }

    if (!result.room) {
      return jsonError("ไม่สามารถอัปเดตรายชื่อผู้เล่นได้", 500);
    }

    return jsonOk(
      {
        room: toRoomSummary(result.room),
        canManageLobby: true,
      },
      201,
    );
  } catch (error) {
    logger.error("rooms.players.create.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "ไม่สามารถเพิ่มผู้เล่นได้ในขณะนี้");
  }
}

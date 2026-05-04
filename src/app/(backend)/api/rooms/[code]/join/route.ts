import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { toRoomPlayer, toRoomSummary } from "@/backend/apiFilter";
import {
  buildSessionCookieOptions,
  enforceRateLimit,
  enforceSameOrigin,
  jsonError,
  jsonOk,
  mapServerError,
  parseJsonBody,
} from "@/backend/apiUtils";
import logger from "@/backend/logger";
import { withSerializableRetry } from "@/backend/prismaRetry";
import { rateLimitConfigs } from "@/backend/rateLimit";
import {
  addPlayerToRoom,
  ROOM_HOST_ACCESS_SELECT,
} from "@/backend/roomService";
import { roomCodeSchema, roomJoinSchema } from "@/shared/schemas";
import { getRoomPlayerCookieName, signRoomPlayerToken } from "@/backend/roomAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOM_JOIN_UNAVAILABLE_MESSAGE = "Room is unavailable.";

// POST /api/rooms/[code]/join - Join a room
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const rateLimited = enforceRateLimit(request, rateLimitConfigs.roomJoin);
    if (rateLimited) return rateLimited;

    const { code } = await params;
    const roomCode = code.toUpperCase();

    const codeValidation = roomCodeSchema.safeParse(roomCode);
    if (!codeValidation.success) {
      return jsonError("รหัสห้องไม่ถูกต้อง", 400);
    }

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.body;
    const nameValidation = roomJoinSchema.safeParse({ playerName: body.playerName });
    if (!nameValidation.success) {
      return jsonError(
        nameValidation.error.issues[0]?.message || "ชื่อผู้เล่นไม่ถูกต้อง",
        400,
      );
    }

    const playerName = nameValidation.data.playerName;

    const { default: prisma } = await import("@/backend/db");
    const joinResult = await withSerializableRetry(async () => {
      return prisma.$transaction(
        async (tx) => {
          const room = await tx.room.findUnique({
            where: { code: roomCode },
            select: ROOM_HOST_ACCESS_SELECT,
          });

          if (!room) {
            return { kind: "not_found" as const };
          }

          if (!room.isActive) {
            return { kind: "inactive" as const };
          }

          const createResult = await addPlayerToRoom(tx, room, playerName, false);
          if (createResult.kind !== "created") {
            return createResult;
          }

          return {
            kind: "joined" as const,
            roomId: room.id,
            player: createResult.player,
            updatedRoom: createResult.roomSummary,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    }, "Could not join room");

    if (joinResult.kind === "not_found" || joinResult.kind === "inactive") {
      return jsonError(ROOM_JOIN_UNAVAILABLE_MESSAGE, 404);
    }

    if (joinResult.kind === "full") {
      return jsonError("ห้องเต็มแล้ว", 409);
    }

    if (joinResult.kind === "name_taken") {
      return jsonError("ชื่อนี้ถูกใช้แล้วในห้องนี้", 409);
    }

    if (joinResult.kind === "room_missing") {
      return jsonError("ไม่สามารถอัปเดตรายชื่อผู้เล่นได้", 500);
    }

    if (joinResult.kind !== "joined") {
      return jsonError("ไม่สามารถเข้าร่วมห้องได้ในขณะนี้", 500);
    }

    const response = jsonOk(
      {
        room: joinResult.updatedRoom ? toRoomSummary(joinResult.updatedRoom) : null,
        player: toRoomPlayer(joinResult.player),
      },
      201,
    );

    const playerToken = signRoomPlayerToken({
      roomId: joinResult.roomId,
      playerId: joinResult.player.id,
      code: roomCode,
    });

    response.cookies.set(
      getRoomPlayerCookieName(roomCode),
      playerToken,
      buildSessionCookieOptions(60 * 60 * 4, "/api/rooms"),
    );

    return response;
  } catch (error) {
    logger.error("rooms.join.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "ไม่สามารถเข้าร่วมห้องได้ในขณะนี้");
  }
}

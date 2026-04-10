import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { toRoomSummary } from "@/backend/apiFilter";
import {
  enforceRateLimit,
  enforceSameOrigin,
  jsonError,
  jsonOk,
  mapServerError,
} from "@/backend/apiUtils";
import logger from "@/backend/logger";
import { withSerializableRetry } from "@/backend/prismaRetry";
import { rateLimitConfigs } from "@/backend/rateLimit";
import { getRoomHostPayloadFromCookies } from "@/backend/roomAuth";
import {
  removePlayerFromRoom,
  requireRoomHost,
} from "@/backend/roomService";
import { roomCodeSchema } from "@/shared/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const { default: prisma } = await import("@/backend/db");
    const result = await withSerializableRetry(async () =>
      prisma.$transaction(
        async (tx) => {
          const access = await requireRoomHost(tx, roomCode, payload);
          if (access.kind !== "ok") {
            return access;
          }

          const removeResult = await removePlayerFromRoom(
            tx,
            access.room,
            normalizedPlayerId,
          );
          if (removeResult.kind !== "removed") {
            return removeResult;
          }

          return {
            kind: "removed" as const,
            room: removeResult.roomSummary,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      ),
      "Could not remove player",
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

    if (result.kind === "room_missing") {
      return jsonError("ไม่สามารถอัปเดตรายชื่อผู้เล่นได้", 500);
    }

    if (result.kind !== "removed") {
      return jsonError("ไม่สามารถลบผู้เล่นได้ในขณะนี้", 500);
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

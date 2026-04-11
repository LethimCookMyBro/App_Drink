import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import {
  attachPendingRoomQuestionsToSession,
  chooseNextSessionState,
  sessionNeedsCurrentTurnHydration,
} from "@/backend/gameSessionState";
import { toRoomSummary } from "@/backend/apiFilter";
import { enforceRateLimit, enforceSameOrigin, jsonError, jsonOk, mapServerError } from "@/backend/apiUtils";
import logger from "@/backend/logger";
import { withSerializableRetry } from "@/backend/prismaRetry";
import { rateLimitConfigs } from "@/backend/rateLimit";
import {
  getRoomSummaryById,
  getRoomSummaryByCode,
  ROOM_SUMMARY_SELECT,
  requireRoomHost,
  requireRoomParticipant,
} from "@/backend/roomService";
import { roomCodeSchema } from "@/shared/schemas";
import {
  getRoomHostPayloadFromCookies,
  getRoomPlayerPayloadFromCookies,
} from "@/backend/roomAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/rooms/[code] - Get room by code
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const rateLimited = enforceRateLimit(request, rateLimitConfigs.roomLookup);
    if (rateLimited) return rateLimited;

    const { code } = await params;
    const roomCode = code.toUpperCase();

    const validation = roomCodeSchema.safeParse(roomCode);
    if (!validation.success) {
      return jsonError("รหัสห้องไม่ถูกต้อง", 400);
    }

    const { default: prisma } = await import("@/backend/db");

    const hostPayload = await getRoomHostPayloadFromCookies(roomCode);
    const playerPayload = await getRoomPlayerPayloadFromCookies(roomCode);
    const access = await requireRoomParticipant(
      prisma,
      roomCode,
      hostPayload,
      playerPayload,
    );

    if (access.kind === "unauthorized" || access.kind === "forbidden") {
      return jsonError("กรุณาเข้าร่วมห้องก่อนดูข้อมูลห้อง", 403);
    }

    if (access.kind === "not_found") {
      return jsonError("ไม่พบห้อง", 404);
    }

    if (access.kind === "inactive") {
      return jsonError("ห้องนี้ถูกปิดแล้ว", 410);
    }

    if (access.kind !== "ok") {
      return jsonError("กรุณาเข้าร่วมห้องก่อนดูข้อมูลห้อง", 403);
    }

    const room = await withSerializableRetry(async () =>
      prisma.$transaction(
        async (tx) => {
          const currentRoom = await getRoomSummaryByCode(tx, roomCode);
          if (!currentRoom) {
            return null;
          }

          const activeSession = currentRoom.sessions[0] ?? null;
          if (!sessionNeedsCurrentTurnHydration(activeSession)) {
            return currentRoom;
          }

          await attachPendingRoomQuestionsToSession(
            tx,
            currentRoom.id,
            activeSession.id,
          );

          const nextState = await chooseNextSessionState(tx, activeSession.id);
          await tx.gameSession.update({
            where: { id: activeSession.id },
            data: nextState,
          });

          return (await getRoomSummaryById(tx, currentRoom.id)) ?? currentRoom;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      ),
      "Could not refresh room session state",
    );
    if (!room) {
      return jsonError("ไม่พบห้อง", 404);
    }

    const roomSummary = toRoomSummary(room);

    return jsonOk({
      room: roomSummary,
      activeSession: roomSummary.activeSession ?? null,
      canManageLobby: access.canManageLobby,
    });
  } catch (error) {
    logger.error("rooms.get.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "ไม่สามารถดึงข้อมูลห้องได้ในขณะนี้");
  }
}

// DELETE /api/rooms/[code] - Close room (host only)
export async function DELETE(
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

    const validation = roomCodeSchema.safeParse(roomCode);
    if (!validation.success) {
      return jsonError("รหัสห้องไม่ถูกต้อง", 400);
    }

    const payload = await getRoomHostPayloadFromCookies(roomCode);
    const { default: prisma } = await import("@/backend/db");
    const access = await requireRoomHost(prisma, roomCode, payload);
    if (access.kind === "unauthorized") {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 401);
    }

    if (access.kind === "not_found") {
      return jsonError("ไม่พบห้อง", 404);
    }

    if (access.kind === "inactive") {
      return jsonError("ห้องนี้ถูกปิดแล้ว", 410);
    }

    if (access.kind === "forbidden") {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 403);
    }

    if (access.kind !== "ok") {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 403);
    }

    const updated = await prisma.room.update({
      where: { id: access.room.id },
      data: { isActive: false },
      select: ROOM_SUMMARY_SELECT,
    });

    return jsonOk({ message: "ห้องถูกปิดแล้ว", room: toRoomSummary(updated) });
  } catch (error) {
    logger.error("rooms.delete.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "ไม่สามารถปิดห้องได้ในขณะนี้");
  }
}

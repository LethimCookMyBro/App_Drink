import { NextRequest } from "next/server";
import { enforceRateLimit, enforceSameOrigin, jsonError, jsonOk } from "@/lib/apiUtils";
import { rateLimitConfigs } from "@/lib/rateLimit";
import { roomCodeSchema } from "@/lib/validation";
import {
  getRoomHostPayloadFromCookies,
  getRoomPlayerPayloadFromCookies,
} from "@/lib/roomAuth";

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

    const { default: prisma } = await import("@/lib/db");

    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      include: {
        players: {
          orderBy: { joinedAt: "asc" },
        },
        sessions: {
          where: { status: "ACTIVE" },
          take: 1,
        },
      },
    });

    if (!room) {
      return jsonError("ไม่พบห้อง", 404);
    }

    if (!room.isActive) {
      return jsonError("ห้องนี้ถูกปิดแล้ว", 410);
    }

    const hostPayload = await getRoomHostPayloadFromCookies(roomCode);
    const playerPayload = await getRoomPlayerPayloadFromCookies(roomCode);

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
      return jsonError("กรุณาเข้าร่วมห้องก่อนดูข้อมูลห้อง", 403);
    }

    return jsonOk({ room });
  } catch (error) {
    console.error("Error fetching room:", error);
    return jsonError("ไม่สามารถดึงข้อมูลห้องได้ในขณะนี้", 500);
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

    const rateLimited = enforceRateLimit(request, rateLimitConfigs.rooms);
    if (rateLimited) return rateLimited;

    const { code } = await params;
    const roomCode = code.toUpperCase();

    const validation = roomCodeSchema.safeParse(roomCode);
    if (!validation.success) {
      return jsonError("รหัสห้องไม่ถูกต้อง", 400);
    }

    const payload = await getRoomHostPayloadFromCookies(roomCode);
    if (!payload || payload.code !== roomCode) {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 401);
    }

    const { default: prisma } = await import("@/lib/db");
    const room = await prisma.room.findUnique({ where: { code: roomCode } });

    if (!room) {
      return jsonError("ไม่พบห้อง", 404);
    }

    if (room.id !== payload.roomId || room.hostId !== payload.hostId) {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 403);
    }

    const updated = await prisma.room.update({
      where: { code: roomCode },
      data: { isActive: false },
    });

    return jsonOk({ message: "ห้องถูกปิดแล้ว", room: updated });
  } catch (error) {
    console.error("Error closing room:", error);
    return jsonError("ไม่สามารถปิดห้องได้ในขณะนี้", 500);
  }
}

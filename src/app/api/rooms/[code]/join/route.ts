import { NextRequest } from "next/server";
import { toRoomPlayer, toRoomSummary } from "@/lib/apiFilter";
import {
  buildSessionCookieOptions,
  enforceRateLimit,
  enforceSameOrigin,
  jsonError,
  jsonOk,
  mapServerError,
} from "@/lib/apiUtils";
import logger from "@/lib/logger";
import { rateLimitConfigs } from "@/lib/rateLimit";
import { roomCodeSchema, roomJoinSchema } from "@/lib/schemas";
import { getRoomPlayerCookieName, signRoomPlayerToken } from "@/lib/roomAuth";
import { verifyTurnstileToken } from "@/lib/cloudflare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/rooms/[code]/join - Join a room
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

    const body = await request.json();
    const nameValidation = roomJoinSchema.safeParse({ playerName: body.playerName });
    if (!nameValidation.success) {
      return jsonError(
        nameValidation.error.issues[0]?.message || "ชื่อผู้เล่นไม่ถูกต้อง",
        400,
      );
    }

    const turnstileCheck = await verifyTurnstileToken(
      request,
      body?.turnstileToken,
      "room_join",
    );
    if (!turnstileCheck.ok) {
      return jsonError(
        turnstileCheck.error || "การยืนยันความปลอดภัยไม่ผ่าน",
        turnstileCheck.status || 400,
      );
    }

    const playerName = nameValidation.data.playerName;

    const { default: prisma } = await import("@/lib/db");

    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      include: {
        players: {
          select: {
            id: true,
            name: true,
            isHost: true,
            isReady: true,
          },
        },
      },
    });

    if (!room) {
      return jsonError("ไม่พบห้อง", 404);
    }

    if (!room.isActive) {
      return jsonError("ห้องนี้ถูกปิดแล้ว", 410);
    }

    if (room.players.length >= room.maxPlayers) {
      return jsonError("ห้องเต็มแล้ว", 409);
    }

    const nameTaken = room.players.some(
      (p) => p.name.toLowerCase() === playerName.toLowerCase(),
    );
    if (nameTaken) {
      return jsonError("ชื่อนี้ถูกใช้แล้วในห้องนี้", 409);
    }

    const player = await prisma.player.create({
      data: {
        name: playerName,
        roomId: room.id,
        isHost: false,
        isReady: false,
      },
    });

    const updatedRoom = await prisma.room.findUnique({
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

    const response = jsonOk(
      {
        room: updatedRoom ? toRoomSummary(updatedRoom) : null,
        player: toRoomPlayer(player),
      },
      201,
    );

    const playerToken = signRoomPlayerToken({
      roomId: room.id,
      playerId: player.id,
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

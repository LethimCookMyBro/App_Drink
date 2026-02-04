import { NextRequest } from "next/server";
import { enforceRateLimit, enforceSameOrigin, jsonError, jsonOk } from "@/lib/apiUtils";
import { rateLimitConfigs } from "@/lib/rateLimit";
import { playerNameSchema, roomCodeSchema, sanitizeHtml } from "@/lib/validation";

// POST /api/rooms/[code]/join - Join a room
export async function POST(
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

    const codeValidation = roomCodeSchema.safeParse(roomCode);
    if (!codeValidation.success) {
      return jsonError("รหัสห้องไม่ถูกต้อง", 400);
    }

    const body = await request.json();
    const nameValidation = playerNameSchema.safeParse(body.playerName);
    if (!nameValidation.success) {
      return jsonError(
        nameValidation.error.issues[0]?.message || "ชื่อผู้เล่นไม่ถูกต้อง",
        400,
      );
    }

    const playerName = sanitizeHtml(nameValidation.data);

    const { default: prisma } = await import("@/lib/db");

    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      include: { players: true },
    });

    if (!room) {
      return jsonError("ไม่พบห้อง", 404);
    }

    if (!room.isActive) {
      return jsonError("ห้องนี้ถูกปิดแล้ว", 410);
    }

    if (room.players.length >= room.maxPlayers) {
      return jsonError("ห้องเต็มแล้ว", 400);
    }

    const nameTaken = room.players.some(
      (p) => p.name.toLowerCase() === playerName.toLowerCase(),
    );
    if (nameTaken) {
      return jsonError("ชื่อนี้ถูกใช้แล้วในห้องนี้", 400);
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
      include: { players: { orderBy: { joinedAt: "asc" } } },
    });

    return jsonOk(
      {
        room: updatedRoom,
        player,
      },
      201,
    );
  } catch (error) {
    console.error("Error joining room:", error);
    return jsonError(
      "ไม่สามารถเข้าร่วมห้องได้",
      500,
      {
        detail:
          "กรุณาเชื่อมต่อ Database ก่อน (Start PostgreSQL และรัน: npx prisma db push)",
      },
    );
  }
}

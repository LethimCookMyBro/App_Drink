import { NextRequest } from "next/server";
import { enforceRateLimit, enforceSameOrigin, jsonError, jsonOk } from "@/lib/apiUtils";
import { rateLimitConfigs } from "@/lib/rateLimit";
import { roomCodeSchema } from "@/lib/validation";
import { getRoomHostPayloadFromCookies } from "@/lib/roomAuth";

// Valid game modes (inline to avoid import issues when DB is offline)
type GameModeType = "QUESTION" | "VOTE" | "TRUTH_OR_DARE" | "CHAOS" | "MIXED";

// POST /api/rooms/[code]/start - Start a game session
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
    const { mode = "QUESTION" } = body;

    const validModes: GameModeType[] = [
      "QUESTION",
      "VOTE",
      "TRUTH_OR_DARE",
      "CHAOS",
      "MIXED",
    ];
    if (!validModes.includes(mode as GameModeType)) {
      return jsonError("โหมดเกมไม่ถูกต้อง", 400);
    }

    const payload = await getRoomHostPayloadFromCookies(roomCode);
    if (!payload || payload.code !== roomCode) {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 401);
    }

    const { default: prisma } = await import("@/lib/db");

    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      include: {
        sessions: { where: { status: "ACTIVE" } },
      },
    });

    if (!room) {
      return jsonError("ไม่พบห้อง", 404);
    }

    if (!room.isActive) {
      return jsonError("ห้องนี้ถูกปิดแล้ว", 410);
    }

    if (room.id !== payload.roomId || room.hostId !== payload.hostId) {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 403);
    }

    if (room.sessions.length > 0) {
      return jsonError("มีเกมกำลังดำเนินการอยู่แล้ว", 400);
    }

    const session = await prisma.gameSession.create({
      data: {
        roomId: room.id,
        mode: mode as GameModeType,
        status: "ACTIVE",
      },
    });

    return jsonOk(
      {
        session,
        message: "เริ่มเกมแล้ว!",
      },
      201,
    );
  } catch (error) {
    console.error("Error starting game:", error);
    return jsonError(
      "ไม่สามารถเริ่มเกมได้",
      500,
      {
        detail:
          "กรุณาเชื่อมต่อ Database ก่อน (Start PostgreSQL และรัน: npx prisma db push)",
      },
    );
  }
}

import { NextRequest } from "next/server";
import { toRoomPlayer, toRoomSummary } from "@/lib/apiFilter";
import { requireAdmin } from "@/lib/adminAuth";
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
import { createRoomSchema } from "@/lib/schemas";
import { signRoomHostToken, getRoomHostCookieName } from "@/lib/roomAuth";
import { verifyTurnstileToken } from "@/lib/cloudflare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Generate 4-character room code
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// GET /api/rooms - List active rooms (for admin)
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 401);
    }

    const { default: prisma } = await import("@/lib/db");

    const rooms = await prisma.room.findMany({
      where: { isActive: true },
      select: {
        code: true,
        name: true,
        maxPlayers: true,
        isActive: true,
        players: {
          select: {
            id: true,
            name: true,
            isHost: true,
            isReady: true,
          },
        },
        _count: { select: { sessions: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return jsonOk({
      rooms: rooms.map((room) => ({
        ...toRoomSummary(room),
        activeSessionCount: room._count.sessions,
      })),
    });
  } catch (error) {
    logger.error("rooms.list.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "ไม่สามารถโหลดข้อมูลห้องได้ในขณะนี้");
  }
}

// POST /api/rooms - Create a new room
export async function POST(request: NextRequest) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const rateLimited = enforceRateLimit(request, rateLimitConfigs.roomCreate);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const validation = createRoomSchema.safeParse({
      hostName: body.hostName,
      roomName: body.name ?? body.roomName,
      maxPlayers: body.maxPlayers,
      is18Plus: body.is18Plus,
      difficulty: body.difficulty,
    });

    if (!validation.success) {
      return jsonError(
        validation.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง",
        400,
      );
    }

    const turnstileCheck = await verifyTurnstileToken(
      request,
      body?.turnstileToken,
      "room_create",
    );
    if (!turnstileCheck.ok) {
      return jsonError(
        turnstileCheck.error || "การยืนยันความปลอดภัยไม่ผ่าน",
        turnstileCheck.status || 400,
      );
    }

    const { hostName, roomName, maxPlayers, is18Plus, difficulty } =
      validation.data;

    const name = roomName?.trim() || "Wong Taek Room";

    const { default: prisma } = await import("@/lib/db");

    // Generate unique room code
    let code = generateRoomCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.room.findUnique({ where: { code } });
      if (!existing) break;
      code = generateRoomCode();
      attempts++;
    }

    const codeExists = await prisma.room.findUnique({ where: { code } });
    if (codeExists) {
      return jsonError("ไม่สามารถสร้างรหัสห้องใหม่ได้ กรุณาลองอีกครั้ง", 503);
    }

    const room = await prisma.$transaction(async (tx) => {
      const createdRoom = await tx.room.create({
        data: {
          code,
          name,
          hostId: "",
          difficulty: Math.min(5, Math.max(1, difficulty)),
          is18Plus,
          maxPlayers,
          players: {
            create: {
              name: hostName,
              isHost: true,
              isReady: true,
            },
          },
        },
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

      const host = createdRoom.players[0];

      await tx.room.update({
        where: { id: createdRoom.id },
        data: { hostId: host.id },
      });

      return {
        room: createdRoom,
        host,
      };
    });

    const hostToken = signRoomHostToken({
      roomId: room.room.id,
      hostId: room.host.id,
      code,
    });

    const response = jsonOk(
      {
        room: toRoomSummary(room.room),
        player: toRoomPlayer(room.host),
      },
      201,
    );

    response.cookies.set(
      getRoomHostCookieName(code),
      hostToken,
      buildSessionCookieOptions(60 * 60 * 4, "/api/rooms"),
    );

    return response;
  } catch (error) {
    logger.error("rooms.create.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "ไม่สามารถสร้างห้องได้ในขณะนี้");
  }
}

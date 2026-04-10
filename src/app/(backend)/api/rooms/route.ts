import { NextRequest } from "next/server";
import { toRoomPlayer, toRoomSummary } from "@/backend/apiFilter";
import { requireAdmin } from "@/backend/adminAuth";
import {
  buildSessionCookieOptions,
  enforceRateLimit,
  enforceSameOrigin,
  jsonError,
  jsonOk,
  mapServerError,
} from "@/backend/apiUtils";
import logger from "@/backend/logger";
import { isUniqueConstraintError } from "@/backend/prismaRetry";
import { rateLimitConfigs } from "@/backend/rateLimit";
import { createRoomSchema } from "@/shared/schemas";
import { signRoomHostToken, getRoomHostCookieName } from "@/backend/roomAuth";
import { normalizePlayerNameKey } from "@/backend/roomService";

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

const MAX_ROOM_CODE_ATTEMPTS = 10;

// GET /api/rooms - List active rooms (for admin)
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 401);
    }

    const { default: prisma } = await import("@/backend/db");

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

    const { hostName, roomName, maxPlayers, is18Plus, difficulty } =
      validation.data;

    const name = roomName?.trim() || "Wong Taek Room";

    const { default: prisma } = await import("@/backend/db");

    let room:
      | {
          room: {
            id: string;
            code: string;
            name: string;
            maxPlayers: number;
            isActive: boolean;
            players: Array<{
              id: string;
              name: string;
              isHost: boolean;
              isReady: boolean;
            }>;
          };
          host: {
            id: string;
            name: string;
            isHost: boolean;
            isReady: boolean;
          };
        }
      | null = null;

    for (let attempt = 0; attempt < MAX_ROOM_CODE_ATTEMPTS; attempt += 1) {
      const code = generateRoomCode();

      try {
        room = await prisma.$transaction(async (tx) => {
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
                  nameKey: normalizePlayerNameKey(hostName),
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
        break;
      } catch (error) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }
      }
    }

    if (!room) {
      return jsonError("ไม่สามารถสร้างรหัสห้องใหม่ได้ กรุณาลองอีกครั้ง", 503);
    }

    const hostToken = signRoomHostToken({
      roomId: room.room.id,
      hostId: room.host.id,
      code: room.room.code,
    });

    const response = jsonOk(
      {
        room: toRoomSummary(room.room),
        player: toRoomPlayer(room.host),
      },
      201,
    );

    response.cookies.set(
      getRoomHostCookieName(room.room.code),
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

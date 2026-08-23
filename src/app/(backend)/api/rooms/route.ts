import { randomInt } from "node:crypto";
import { NextRequest } from "next/server";
import { toRoomPlayer, toRoomSummary } from "@/backend/apiFilter";
import { getAdminAccessError, requireAdminRole } from "@/backend/adminAuth";
import {
  clearLegacyAuthCookie,
  getAuthenticatedAppUser,
} from "@/backend/appAuth";
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
import { isUniqueConstraintError } from "@/backend/prismaRetry";
import { rateLimitConfigs } from "@/backend/rateLimit";
import { createRoomSchema } from "@/shared/schemas";
import { signRoomHostToken, getRoomHostCookieName } from "@/backend/roomAuth";
import { normalizePlayerNameKey } from "@/backend/roomService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOM_CODE_LENGTH = 8;

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    code += chars.charAt(randomInt(chars.length));
  }
  return code;
}

const MAX_ROOM_CODE_ATTEMPTS = 10;

// GET /api/rooms - List active rooms (for admin)
export async function GET() {
  try {
    const access = await requireAdminRole("ADMIN");
    if (access.kind !== "ok") {
      const { message, status } = getAdminAccessError(access);
      return jsonError(message, status);
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

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.body;
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

    let clearLegacyCookie = false;
    if (is18Plus) {
      const auth = await getAuthenticatedAppUser(request);
      clearLegacyCookie = auth.clearLegacyCookie;

      if (!auth.user) {
        logger.warn("rooms.create.adult_content_requires_auth", {
          limitation:
            "18+ mode requires authentication but does not verify legal age.",
        });
        const response = jsonError("Sign in before creating an 18+ room.", 401);
        if (clearLegacyCookie) {
          clearLegacyAuthCookie(response);
        }
        return response;
      }

      logger.warn("rooms.create.adult_content_auth_only", {
        userId: auth.user.id,
        limitation:
          "18+ mode requires authentication but does not verify legal age.",
      });
    }

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
              difficulty,
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

    if (clearLegacyCookie) {
      clearLegacyAuthCookie(response);
    }

    return response;
  } catch (error) {
    logger.error("rooms.create.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "ไม่สามารถสร้างห้องได้ในขณะนี้");
  }
}

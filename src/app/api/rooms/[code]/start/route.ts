import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import {
  enforceRateLimit,
  enforceSameOrigin,
  jsonError,
  jsonOk,
  mapServerError,
} from "@/lib/apiUtils";
import { getAuthenticatedAppUser } from "@/lib/appAuth";
import logger from "@/lib/logger";
import { rateLimitConfigs } from "@/lib/rateLimit";
import { getRoomHostPayloadFromCookies } from "@/lib/roomAuth";
import { roomCodeSchema, roomStartSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GameModeType = "QUESTION" | "VOTE" | "TRUTH_OR_DARE" | "CHAOS" | "MIXED";

type SessionResponse = {
  id: string;
  mode: GameModeType;
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "ABANDONED";
  startedAt: Date;
  userId: string | null;
};

function parseSessionId(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length >= 10 ? normalized : undefined;
}

function canRetrySerializable(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

async function withSerializableRetry<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0;

  while (attempt < 4) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;
      if (!canRetrySerializable(error) || attempt >= 4) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 15 * 2 ** attempt));
    }
  }

  throw new Error("Could not start room session");
}

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

    const body = await request.json().catch(() => ({}));
    const modeValidation = roomStartSchema.safeParse({
      mode: body?.mode,
    });
    if (!modeValidation.success) {
      return jsonError("โหมดเกมไม่ถูกต้อง", 400);
    }

    const sessionId = parseSessionId(body?.sessionId);
    const { mode } = modeValidation.data;

    const payload = await getRoomHostPayloadFromCookies(roomCode);
    if (!payload || payload.code !== roomCode) {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 401);
    }

    const { user } = await getAuthenticatedAppUser(request);
    const authenticatedUserId = user?.id ?? null;

    const { default: prisma } = await import("@/lib/db");
    const result = await withSerializableRetry(async () => {
      return prisma.$transaction(
        async (tx) => {
          const room = await tx.room.findUnique({
            where: { code: roomCode },
            select: {
              id: true,
              hostId: true,
              isActive: true,
              sessions: {
                where: { status: "ACTIVE" },
                orderBy: { startedAt: "desc" },
                take: 1,
                select: {
                  id: true,
                  mode: true,
                  status: true,
                  startedAt: true,
                  userId: true,
                },
              },
            },
          });

          if (!room) {
            return { kind: "not_found" as const };
          }

          if (!room.isActive) {
            return { kind: "inactive" as const };
          }

          if (room.id !== payload.roomId || room.hostId !== payload.hostId) {
            return { kind: "forbidden" as const };
          }

          const activeSession = room.sessions[0] ?? null;
          if (activeSession) {
            if (sessionId && activeSession.id !== sessionId) {
              return {
                kind: "conflict" as const,
                activeSession,
              };
            }

            const needsUpdate =
              activeSession.mode !== mode ||
              (!activeSession.userId && authenticatedUserId);

            const updatedSession = needsUpdate
              ? await tx.gameSession.update({
                  where: { id: activeSession.id },
                  data: {
                    mode,
                    ...(authenticatedUserId && !activeSession.userId
                      ? { userId: authenticatedUserId }
                      : {}),
                  },
                  select: {
                    id: true,
                    mode: true,
                    status: true,
                    startedAt: true,
                    userId: true,
                  },
                })
              : activeSession;

            return {
              kind: "existing" as const,
              session: updatedSession,
            };
          }

          const createdSession = await tx.gameSession.create({
            data: {
              roomId: room.id,
              userId: authenticatedUserId,
              mode,
              status: "ACTIVE",
            },
            select: {
              id: true,
              mode: true,
              status: true,
              startedAt: true,
              userId: true,
            },
          });

          return {
            kind: "created" as const,
            session: createdSession,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    });

    if (result.kind === "not_found") {
      return jsonError("ไม่พบห้อง", 404);
    }

    if (result.kind === "inactive") {
      return jsonError("ห้องนี้ถูกปิดแล้ว", 410);
    }

    if (result.kind === "forbidden") {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 403);
    }

    if (result.kind === "conflict") {
      return jsonError("มีเกมอีก session กำลังดำเนินการอยู่", 409, {
        sessionId: result.activeSession.id,
      });
    }

    const session = result.session as SessionResponse;
    return jsonOk(
      {
        sessionId: session.id,
        session: {
          id: session.id,
          mode: session.mode,
          status: session.status,
          startedAt: session.startedAt,
        },
      },
      result.kind === "created" ? 201 : 200,
    );
  } catch (error) {
    logger.error("rooms.start.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "ไม่สามารถเริ่มเกมได้ในขณะนี้");
  }
}

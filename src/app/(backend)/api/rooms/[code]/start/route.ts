import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import {
  enforceRateLimit,
  enforceSameOrigin,
  jsonError,
  jsonOk,
  mapServerError,
} from "@/backend/apiUtils";
import { getAuthenticatedAppUser } from "@/backend/appAuth";
import logger from "@/backend/logger";
import { withSerializableRetry } from "@/backend/prismaRetry";
import { rateLimitConfigs } from "@/backend/rateLimit";
import { getRoomHostPayloadFromCookies } from "@/backend/roomAuth";
import { requireRoomHost } from "@/backend/roomService";
import { roomCodeSchema, roomStartSchema } from "@/shared/schemas";

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

    const { default: prisma } = await import("@/backend/db");
    const result = await withSerializableRetry(async () => {
      return prisma.$transaction(
        async (tx) => {
          const access = await requireRoomHost(tx, roomCode, payload);
          if (access.kind !== "ok") {
            return access;
          }

          const activeSession = await tx.gameSession.findFirst({
            where: {
              roomId: access.room.id,
              status: "ACTIVE",
            },
            orderBy: { startedAt: "desc" },
            select: {
              id: true,
              mode: true,
              status: true,
              startedAt: true,
              userId: true,
            },
          });

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
              roomId: access.room.id,
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
    }, "Could not start room session");

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

    if (result.kind !== "existing" && result.kind !== "created") {
      return jsonError("ไม่สามารถเริ่มเกมได้ในขณะนี้", 500);
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

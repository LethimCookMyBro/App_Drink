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
import {
  attachPendingRoomQuestionsToSession,
  chooseNextSessionState,
  sessionNeedsCurrentTurnHydration,
} from "@/backend/gameSessionState";
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
  resumePath: string | null;
  roundCount: number;
  totalDrinks: number;
  currentPlayerId: string | null;
  currentQuestionId: string | null;
  currentQuestionText: string | null;
  currentQuestionType: string | null;
  currentQuestionLevel: number | null;
  currentQuestionIs18Plus: boolean;
  currentQuestionIsCustom: boolean;
  currentTurnToken: string | null;
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
      resumePath: body?.resumePath,
    });
    if (!modeValidation.success) {
      return jsonError("โหมดเกมไม่ถูกต้อง", 400);
    }

    const sessionId = parseSessionId(body?.sessionId);
    const { mode, resumePath } = modeValidation.data;

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
              resumePath: true,
              roundCount: true,
              totalDrinks: true,
              currentPlayerId: true,
              currentQuestionId: true,
              currentQuestionText: true,
              currentQuestionType: true,
              currentQuestionLevel: true,
              currentQuestionIs18Plus: true,
              currentQuestionIsCustom: true,
              currentTurnToken: true,
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
              activeSession.resumePath !== resumePath ||
              (!activeSession.userId && authenticatedUserId);

            const updatedSession = needsUpdate
              ? await tx.gameSession.update({
                  where: { id: activeSession.id },
                  data: {
                    mode,
                    resumePath,
                    ...(authenticatedUserId && !activeSession.userId
                      ? { userId: authenticatedUserId }
                      : {}),
                  },
                  select: {
                    id: true,
                    mode: true,
                    status: true,
                    resumePath: true,
                    roundCount: true,
                    totalDrinks: true,
                    currentPlayerId: true,
                    currentQuestionId: true,
                    currentQuestionText: true,
                    currentQuestionType: true,
                    currentQuestionLevel: true,
                    currentQuestionIs18Plus: true,
                    currentQuestionIsCustom: true,
                    currentTurnToken: true,
                    startedAt: true,
                    userId: true,
                  },
                })
              : activeSession;

            if (sessionNeedsCurrentTurnHydration(updatedSession)) {
              await attachPendingRoomQuestionsToSession(
                tx,
                access.room.id,
                updatedSession.id,
              );
              const nextState = await chooseNextSessionState(tx, updatedSession.id);
              const rehydratedSession = await tx.gameSession.update({
                where: { id: updatedSession.id },
                data: nextState,
                select: {
                  id: true,
                  mode: true,
                  status: true,
                  resumePath: true,
                  roundCount: true,
                  totalDrinks: true,
                  currentPlayerId: true,
                  currentQuestionId: true,
                  currentQuestionText: true,
                  currentQuestionType: true,
                  currentQuestionLevel: true,
                  currentQuestionIs18Plus: true,
                  currentQuestionIsCustom: true,
                  currentTurnToken: true,
                  startedAt: true,
                  userId: true,
                },
              });

              return {
                kind: "existing" as const,
                session: rehydratedSession,
              };
            }

            return {
              kind: "existing" as const,
              session: updatedSession,
            };
          }

          await tx.player.updateMany({
            where: { roomId: access.room.id },
            data: {
              drinkCount: 0,
              skipCount: 0,
            },
          });

          const createdSession = await tx.gameSession.create({
            data: {
              roomId: access.room.id,
              userId: authenticatedUserId,
              mode,
              resumePath,
              status: "ACTIVE",
            },
            select: {
              id: true,
              mode: true,
              status: true,
              resumePath: true,
              roundCount: true,
              totalDrinks: true,
              currentPlayerId: true,
              currentQuestionId: true,
              currentQuestionText: true,
              currentQuestionType: true,
              currentQuestionLevel: true,
              currentQuestionIs18Plus: true,
              currentQuestionIsCustom: true,
              currentTurnToken: true,
              startedAt: true,
              userId: true,
            },
          });

          await attachPendingRoomQuestionsToSession(tx, access.room.id, createdSession.id);
          const nextState = await chooseNextSessionState(tx, createdSession.id);
          const initializedSession = await tx.gameSession.update({
            where: { id: createdSession.id },
            data: nextState,
            select: {
              id: true,
              mode: true,
              status: true,
              resumePath: true,
              roundCount: true,
              totalDrinks: true,
              currentPlayerId: true,
              currentQuestionId: true,
              currentQuestionText: true,
              currentQuestionType: true,
              currentQuestionLevel: true,
              currentQuestionIs18Plus: true,
              currentQuestionIsCustom: true,
              currentTurnToken: true,
              startedAt: true,
              userId: true,
            },
          });

          return {
            kind: "created" as const,
            session: initializedSession,
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
          resumePath: session.resumePath,
          roundCount: session.roundCount,
          totalDrinks: session.totalDrinks,
          currentPlayerId: session.currentPlayerId,
          currentQuestionId: session.currentQuestionId,
          currentQuestionText: session.currentQuestionText,
          currentQuestionType: session.currentQuestionType,
          currentQuestionLevel: session.currentQuestionLevel,
          currentQuestionIs18Plus: session.currentQuestionIs18Plus,
          currentQuestionIsCustom: session.currentQuestionIsCustom,
          currentTurnToken: session.currentTurnToken,
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

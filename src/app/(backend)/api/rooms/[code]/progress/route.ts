import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import {
  enforceRateLimit,
  enforceSameOrigin,
  jsonError,
  jsonOk,
  mapServerError,
} from "@/backend/apiUtils";
import {
  buildProgressEventData,
  chooseNextSessionState,
} from "@/backend/gameSessionState";
import logger from "@/backend/logger";
import { withSerializableRetry } from "@/backend/prismaRetry";
import { rateLimitConfigs } from "@/backend/rateLimit";
import { getRoomHostPayloadFromCookies } from "@/backend/roomAuth";
import { requireRoomHost } from "@/backend/roomService";
import { roomCodeSchema, roomProgressSchema } from "@/shared/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const bodyValidation = roomProgressSchema.safeParse({
      sessionId: body?.sessionId,
      action: body?.action,
      drinkDelta: body?.drinkDelta,
    });
    if (!bodyValidation.success) {
      return jsonError(
        bodyValidation.error.issues[0]?.message || "ข้อมูลความคืบหน้าเกมไม่ถูกต้อง",
        400,
      );
    }

    const { sessionId, action, drinkDelta } = bodyValidation.data;

    const hostPayload = await getRoomHostPayloadFromCookies(roomCode);
    if (!hostPayload) {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 401);
    }

    const { default: prisma } = await import("@/backend/db");
    const access = await requireRoomHost(prisma, roomCode, hostPayload);
    if (access.kind === "not_found") {
      return jsonError("ไม่พบห้อง", 404);
    }

    if (access.kind === "inactive") {
      return jsonError("ห้องนี้ถูกปิดแล้ว", 410);
    }

    if (access.kind !== "ok") {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 403);
    }

    const result = await withSerializableRetry(async () =>
      prisma.$transaction(
        async (tx) => {
          const session = await tx.gameSession.findFirst({
            where: {
              id: sessionId,
              roomId: access.room.id,
            },
            select: {
              id: true,
              status: true,
              resumePath: true,
              roundCount: true,
              totalDrinks: true,
              durationMs: true,
              mode: true,
              currentPlayerId: true,
              currentQuestionId: true,
              currentQuestionText: true,
              currentQuestionType: true,
              currentQuestionLevel: true,
              currentQuestionIs18Plus: true,
              currentQuestionIsCustom: true,
              startedAt: true,
              endedAt: true,
            },
          });

          if (!session) {
            return { kind: "not_found" as const };
          }

          if (session.status !== "ACTIVE") {
            return { kind: "closed" as const, session };
          }

          if (!session.currentPlayerId) {
            return { kind: "invalid_state" as const, session };
          }

          const nextRoundNumber = session.roundCount + 1;
          const eventData = buildProgressEventData({
            customQuestionId: session.currentQuestionIsCustom
              ? session.currentQuestionId
              : null,
            roundNumber: nextRoundNumber,
            drinkDelta,
          });

          await tx.gameEvent.create({
            data: {
              sessionId: session.id,
              playerId: session.currentPlayerId,
              questionId: session.currentQuestionIsCustom
                ? null
                : session.currentQuestionId ?? null,
              type: action,
              data: eventData,
            },
          });

          if (!session.currentQuestionIsCustom && session.currentQuestionId) {
            await tx.question.update({
              where: { id: session.currentQuestionId },
              data: {
                usageCount: {
                  increment: 1,
                },
              },
            });
          }

          if (drinkDelta > 0) {
            await tx.player.update({
              where: { id: session.currentPlayerId },
              data: {
                drinkCount: {
                  increment: drinkDelta,
                },
                skipCount: {
                  increment: 1,
                },
              },
            });
          }

          const nextState = await chooseNextSessionState(tx, session.id);
          const updatedSession = await tx.gameSession.update({
            where: { id: session.id },
            data: {
              roundCount: { increment: 1 },
              totalDrinks: { increment: drinkDelta },
              durationMs: Math.max(
                session.durationMs,
                Date.now() - session.startedAt.getTime(),
              ),
              ...nextState,
            },
            select: {
              id: true,
              status: true,
              resumePath: true,
              roundCount: true,
              totalDrinks: true,
              durationMs: true,
              mode: true,
              currentPlayerId: true,
              currentQuestionId: true,
              currentQuestionText: true,
              currentQuestionType: true,
              currentQuestionLevel: true,
              currentQuestionIs18Plus: true,
              currentQuestionIsCustom: true,
              startedAt: true,
              endedAt: true,
            },
          });

          return { kind: "updated" as const, session: updatedSession };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      ),
      "Could not persist round progress",
    );

    if (result.kind === "not_found") {
      return jsonError("ไม่พบ session ที่กำลังเล่นอยู่", 404);
    }

    if (result.kind === "closed") {
      return jsonError("session นี้จบแล้ว", 409);
    }

    if (result.kind === "invalid_state") {
      return jsonError("สถานะเกมปัจจุบันไม่พร้อมใช้งาน", 409);
    }

    return jsonOk({
      success: true,
      sessionId: result.session.id,
      session: result.session,
    });
  } catch (error) {
    logger.error("rooms.progress.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "ไม่สามารถบันทึกความคืบหน้าเกมได้ในขณะนี้");
  }
}

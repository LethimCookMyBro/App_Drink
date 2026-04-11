import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { toRoomSummary } from "@/backend/apiFilter";
import {
  enforceRateLimit,
  enforceSameOrigin,
  jsonError,
  jsonOk,
  mapServerError,
} from "@/backend/apiUtils";
import logger from "@/backend/logger";
import { withSerializableRetry } from "@/backend/prismaRetry";
import { rateLimitConfigs } from "@/backend/rateLimit";
import { getRoomHostPayloadFromCookies } from "@/backend/roomAuth";
import {
  getRoomSummaryById,
  requireRoomHost,
} from "@/backend/roomService";
import { roomCodeSchema } from "@/shared/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ code: string; questionId: string }> },
) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const rateLimited = enforceRateLimit(request, rateLimitConfigs.roomMutation);
    if (rateLimited) return rateLimited;

    const { code, questionId } = await params;
    const roomCode = code.toUpperCase();
    const codeValidation = roomCodeSchema.safeParse(roomCode);
    if (!codeValidation.success) {
      return jsonError("รหัสห้องไม่ถูกต้อง", 400);
    }

    const payload = await getRoomHostPayloadFromCookies(roomCode);
    if (!payload || payload.code !== roomCode) {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 401);
    }

    const normalizedQuestionId = questionId.trim();
    if (normalizedQuestionId.length < 10) {
      return jsonError("คำถามพิเศษไม่ถูกต้อง", 400);
    }

    const { default: prisma } = await import("@/backend/db");
    const result = await withSerializableRetry(async () =>
      prisma.$transaction(
        async (tx) => {
          const access = await requireRoomHost(tx, roomCode, payload);
          if (access.kind !== "ok") {
            return access;
          }

          const existingQuestion = await tx.roomQuestion.findFirst({
            where: {
              id: normalizedQuestionId,
              roomId: access.room.id,
            },
            select: { id: true },
          });

          if (!existingQuestion) {
            return { kind: "question_not_found" as const };
          }

          await tx.roomQuestion.delete({
            where: {
              id: normalizedQuestionId,
            },
          });

          const room = await getRoomSummaryById(tx, access.room.id);
          return room ? { kind: "deleted" as const, room } : { kind: "room_missing" as const };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      ),
      "Could not remove room custom question",
    );

    if (result.kind === "not_found") {
      return jsonError("ไม่พบห้อง", 404);
    }

    if (result.kind === "inactive") {
      return jsonError("ห้องนี้ถูกปิดแล้ว", 410);
    }

    if (result.kind === "forbidden") {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 403);
    }

    if (result.kind === "question_not_found") {
      return jsonError("ไม่พบคำถามพิเศษ", 404);
    }

    if (result.kind === "room_missing") {
      return jsonError("ไม่สามารถอัปเดตห้องได้", 500);
    }

    if (result.kind !== "deleted") {
      return jsonError("ไม่สามารถลบคำถามพิเศษได้", 500);
    }

    return jsonOk({
      room: toRoomSummary(result.room),
      canManageLobby: true,
    });
  } catch (error) {
    logger.error("rooms.questions.delete.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "ไม่สามารถลบคำถามพิเศษได้ในขณะนี้");
  }
}

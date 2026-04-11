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
import {
  roomCodeSchema,
  roomCustomQuestionSchema,
} from "@/shared/schemas";

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

    const payload = await getRoomHostPayloadFromCookies(roomCode);
    if (!payload || payload.code !== roomCode) {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 401);
    }

    const body = await request.json().catch(() => ({}));
    const validation = roomCustomQuestionSchema.safeParse({
      text: body?.text,
      type: body?.type,
      level: body?.level,
      is18Plus: body?.is18Plus,
    });
    if (!validation.success) {
      return jsonError(
        validation.error.issues[0]?.message || "คำถามไม่ถูกต้อง",
        400,
      );
    }

    const { default: prisma } = await import("@/backend/db");
    const result = await withSerializableRetry(async () =>
      prisma.$transaction(
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
            select: { id: true },
          });

          await tx.roomQuestion.create({
            data: {
              roomId: access.room.id,
              sessionId: activeSession?.id ?? null,
              text: validation.data.text,
              type: validation.data.type,
              level: validation.data.level,
              is18Plus: validation.data.is18Plus,
            },
          });

          const room = await getRoomSummaryById(tx, access.room.id);
          return room ? { kind: "created" as const, room } : { kind: "room_missing" as const };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      ),
      "Could not save room custom question",
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

    if (result.kind === "room_missing") {
      return jsonError("ไม่สามารถอัปเดตห้องได้", 500);
    }

    if (result.kind !== "created") {
      return jsonError("ไม่สามารถเพิ่มคำถามพิเศษได้", 500);
    }

    return jsonOk(
      {
        room: toRoomSummary(result.room),
        canManageLobby: true,
      },
      201,
    );
  } catch (error) {
    logger.error("rooms.questions.create.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "ไม่สามารถเพิ่มคำถามพิเศษได้ในขณะนี้");
  }
}

import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
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
      roundNumber: body?.roundNumber,
      drinkDelta: body?.drinkDelta,
    });
    if (!bodyValidation.success) {
      return jsonError(
        bodyValidation.error.issues[0]?.message || "ข้อมูลความคืบหน้าเกมไม่ถูกต้อง",
        400,
      );
    }

    const { sessionId, roundNumber, drinkDelta } = bodyValidation.data;

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
              roundCount: true,
              totalDrinks: true,
              mode: true,
              startedAt: true,
              endedAt: true,
            },
          });

          if (!session) {
            return { kind: "not_found" as const };
          }

          if (session.status !== "ACTIVE") {
            if (roundNumber <= session.roundCount) {
              return { kind: "noop" as const, session };
            }

            return { kind: "closed" as const, session };
          }

          if (roundNumber <= session.roundCount) {
            return { kind: "noop" as const, session };
          }

          if (roundNumber !== session.roundCount + 1) {
            return { kind: "out_of_sequence" as const, session };
          }

          const updatedSession = await tx.gameSession.update({
            where: { id: session.id },
            data: {
              roundCount: { increment: 1 },
              totalDrinks: { increment: drinkDelta },
            },
            select: {
              id: true,
              status: true,
              roundCount: true,
              totalDrinks: true,
              mode: true,
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
      return jsonError("session นี้จบแล้ว", 409, {
        currentRoundCount: result.session.roundCount,
      });
    }

    if (result.kind === "out_of_sequence") {
      return jsonError("ลำดับรอบเกมไม่ถูกต้อง", 409, {
        currentRoundCount: result.session.roundCount,
      });
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

import { NextRequest } from "next/server";
import { toAdminQuestion } from "@/backend/apiFilter";
import { getAdminAccessError, requireAdminRole } from "@/backend/adminAuth";
import {
  enforceRateLimit,
  enforceSameOrigin,
  jsonError,
  jsonOk,
  mapServerError,
} from "@/backend/apiUtils";
import logger from "@/backend/logger";
import { rateLimitConfigs } from "@/backend/rateLimit";
import { questionSchema } from "@/shared/schemas";
import { GAME_QUESTION_TYPE_SET } from "@/shared/config/gameConstants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseBoundedInt(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function parseBooleanFlag(value: string | null): boolean | null | "invalid" {
  if (value === null) {
    return null;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }

  return "invalid";
}

// GET /api/questions - List questions for admin management
export async function GET(request: NextRequest) {
  try {
    const access = await requireAdminRole("MODERATOR");
    if (access.kind !== "ok") {
      const { message, status } = getAdminAccessError(access);
      return jsonError(message, status);
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const is18Plus = parseBooleanFlag(searchParams.get("is18Plus"));

    if (type && !GAME_QUESTION_TYPE_SET.has(type)) {
      return jsonError("ประเภทคำถามไม่ถูกต้อง", 400);
    }

    if (is18Plus === "invalid") {
      return jsonError("ค่า is18Plus ไม่ถูกต้อง", 400);
    }

    const levelParam = searchParams.get("level");
    const level = levelParam ? parseBoundedInt(levelParam, 1, 1, 3) : null;
    const limit = parseBoundedInt(searchParams.get("limit"), 50, 1, 100);
    const offset = parseBoundedInt(searchParams.get("offset"), 0, 0, 100000);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const where: Record<string, unknown> = {};
    if (!includeInactive) {
      where.isActive = true;
    }
    if (type) {
      where.type = type;
    }
    if (level !== null) {
      where.level = { lte: level };
    }
    if (is18Plus !== null) {
      where.is18Plus = is18Plus;
    }

    const { default: prisma } = await import("@/backend/db");
    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit,
        skip: offset,
        select: {
          id: true,
          text: true,
          type: true,
          level: true,
          is18Plus: true,
          isPublic: true,
          isActive: true,
          usageCount: true,
        },
      }),
      prisma.question.count({ where }),
    ]);

    return jsonOk({
      questions: questions.map(toAdminQuestion),
      total,
      limit,
      offset,
      hasMore: offset + questions.length < total,
      source: "db",
    });
  } catch (error) {
    logger.error("questions.list.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "ไม่สามารถโหลดคำถามได้ในขณะนี้");
  }
}

// POST /api/questions - Create custom question
export async function POST(request: NextRequest) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const rateLimited = enforceRateLimit(request, rateLimitConfigs.questionMutations);
    if (rateLimited) return rateLimited;

    const access = await requireAdminRole("ADMIN");
    if (access.kind !== "ok") {
      const { message, status } = getAdminAccessError(access);
      return jsonError(message, status);
    }
    const { admin } = access;

    const body = await request.json();
    const validation = questionSchema.safeParse(body);
    if (!validation.success) {
      return jsonError(
        validation.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง",
        400,
      );
    }

    const { text, type, level, is18Plus } = validation.data;
    const isPublic =
      typeof body.isPublic === "boolean" ? body.isPublic : true;

    const { default: prisma } = await import("@/backend/db");

    const question = await prisma.question.create({
      data: {
        text,
        type,
        level,
        is18Plus,
        isPublic,
        isActive: true,
        createdBy: admin.id,
      },
      select: {
        id: true,
        text: true,
        type: true,
        level: true,
        is18Plus: true,
        isPublic: true,
        isActive: true,
        usageCount: true,
      },
    });

    return jsonOk({ question: toAdminQuestion(question) }, 201);
  } catch (error) {
    logger.error("questions.create.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "ไม่สามารถสร้างคำถามได้ในขณะนี้");
  }
}

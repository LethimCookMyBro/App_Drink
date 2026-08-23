import { NextRequest } from "next/server";
import { toAdminQuestion } from "@/backend/apiFilter";
import {
  buildQuestionsListOrderBy,
  buildQuestionsListWhere,
  parseQuestionsListQuery,
} from "@/backend/questionsListQuery";
import { getAdminAccessError, requireAdminRole } from "@/backend/adminAuth";
import { writeAdminAuditLog } from "@/backend/adminSecurity";
import {
  enforceRateLimit,
  enforceSameOrigin,
  jsonError,
  jsonOk,
  mapServerError,
  parseJsonBody,
} from "@/backend/apiUtils";
import logger from "@/backend/logger";
import { getClientIP, rateLimitConfigs } from "@/backend/rateLimit";
import { questionSchema } from "@/shared/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUESTION_SELECT = {
  id: true,
  text: true,
  type: true,
  level: true,
  is18Plus: true,
  isPublic: true,
  isActive: true,
  usageCount: true,
} as const;

// GET /api/questions - List questions for admin management
export async function GET(request: NextRequest) {
  try {
    const access = await requireAdminRole("MODERATOR");
    if (access.kind !== "ok") {
      const { message, status } = getAdminAccessError(access);
      return jsonError(message, status);
    }

    const parsed = parseQuestionsListQuery(new URL(request.url).searchParams);
    if (!parsed.ok) {
      return jsonError(parsed.error, 400);
    }
    const { query } = parsed;

    const where = buildQuestionsListWhere(query);

    const { default: prisma } = await import("@/backend/db");
    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        orderBy: buildQuestionsListOrderBy(query.sort),
        take: query.limit,
        skip: query.offset,
        select: QUESTION_SELECT,
      }),
      prisma.question.count({ where }),
    ]);

    return jsonOk({
      questions: questions.map(toAdminQuestion),
      total,
      limit: query.limit,
      offset: query.offset,
      hasMore: query.offset + questions.length < total,
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

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.body;
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
      select: QUESTION_SELECT,
    });

    await writeAdminAuditLog({
      adminId: admin.id,
      action: "ADMIN_QUESTION_CREATE",
      status: "SUCCESS",
      ip: getClientIP(request),
      userAgent: request.headers.get("user-agent") ?? undefined,
      metadata: {
        questionId: question.id,
        type: question.type,
        is18Plus: question.is18Plus,
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

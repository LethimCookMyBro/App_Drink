import { NextRequest } from "next/server";
import { toAdminQuestion } from "@/lib/apiFilter";
import { requireAdmin } from "@/lib/adminAuth";
import { enforceRateLimit, enforceSameOrigin, jsonError, jsonOk } from "@/lib/apiUtils";
import { mapServerError } from "@/lib/apiUtils";
import logger from "@/lib/logger";
import { rateLimitConfigs } from "@/lib/rateLimit";
import { questionUpdateSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/questions/[id] - Get single question
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 401);
    }

    const { id } = await params;
    if (!id || id.length < 10) {
      return jsonError("ไม่พบ ID ที่ถูกต้อง", 400);
    }

    const { default: prisma } = await import("@/lib/db");

    const question = await prisma.question.findUnique({
      where: { id },
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

    if (!question) {
      return jsonError("ไม่พบคำถาม", 404);
    }

    return jsonOk({ question: toAdminQuestion(question) });
  } catch (error) {
    logger.error("questions.get.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "เกิดข้อผิดพลาดในการโหลดคำถาม");
  }
}

// PUT /api/questions/[id] - Update question
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id || id.length < 10) {
      return jsonError("ไม่พบ ID ที่ถูกต้อง", 400);
    }

    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const rateLimited = enforceRateLimit(request, rateLimitConfigs.questionMutations);
    if (rateLimited) return rateLimited;

    const admin = await requireAdmin();
    if (!admin) {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 401);
    }

    const body = await request.json();
    const validation = questionUpdateSchema.safeParse(body);
    if (!validation.success) {
      return jsonError(
        validation.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง",
        400,
      );
    }

    const { text, type, level, is18Plus, isActive, isPublic } =
      validation.data;

    if (
      text === undefined &&
      type === undefined &&
      level === undefined &&
      is18Plus === undefined &&
      isActive === undefined &&
      isPublic === undefined
    ) {
      return jsonError("ไม่มีข้อมูลสำหรับอัปเดต", 400);
    }

    const { default: prisma } = await import("@/lib/db");

    const existing = await prisma.question.findUnique({ where: { id } });
    if (!existing) {
      return jsonError("ไม่พบคำถาม", 404);
    }

    const updateData: Record<string, unknown> = {};
    if (text !== undefined) updateData.text = text;
    if (type !== undefined) updateData.type = type;
    if (level !== undefined) updateData.level = level;
    if (is18Plus !== undefined) updateData.is18Plus = is18Plus;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    const question = await prisma.question.update({
      where: { id },
      data: updateData,
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

    return jsonOk({ question: toAdminQuestion(question) });
  } catch (error) {
    logger.error("questions.update.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "ไม่สามารถแก้ไขคำถามได้ในขณะนี้");
  }
}

// DELETE /api/questions/[id] - Delete question
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id || id.length < 10) {
      return jsonError("ไม่พบ ID ที่ถูกต้อง", 400);
    }

    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const rateLimited = enforceRateLimit(request, rateLimitConfigs.questionMutations);
    if (rateLimited) return rateLimited;

    const admin = await requireAdmin();
    if (!admin) {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 401);
    }

    const { default: prisma } = await import("@/lib/db");

    const existing = await prisma.question.findUnique({ where: { id } });
    if (!existing) {
      return jsonError("ไม่พบคำถาม", 404);
    }

    await prisma.question.update({
      where: { id },
      data: { isActive: false },
    });

    return jsonOk({
      success: true,
      message: "ลบคำถามเรียบร้อย",
    });
  } catch (error) {
    logger.error("questions.delete.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "ไม่สามารถลบคำถามได้ในขณะนี้");
  }
}

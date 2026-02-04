import { z } from "zod";
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { enforceRateLimit, enforceSameOrigin, jsonError, jsonOk } from "@/lib/apiUtils";
import { rateLimitConfigs } from "@/lib/rateLimit";
import { sanitizeHtml } from "@/lib/validation";

const updateSchema = z.object({
  text: z.string().min(5).max(500).optional(),
  type: z.enum(["QUESTION", "TRUTH", "DARE", "CHAOS", "VOTE"]).optional(),
  level: z.number().int().min(1).max(3).optional(),
  is18Plus: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
});

// GET /api/questions/[id] - Get single question
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id || id.length < 10) {
    return jsonError("ไม่พบ ID ที่ถูกต้อง", 400);
  }

  try {
    const { default: prisma } = await import("@/lib/db");

    const question = await prisma.question.findUnique({
      where: { id },
    });

    if (!question) {
      return jsonError("ไม่พบคำถาม", 404);
    }

    return jsonOk({ question });
  } catch (error) {
    console.error("Error fetching question:", error);
    return jsonError("เกิดข้อผิดพลาด", 500, {
      detail: "ไม่สามารถเชื่อมต่อ Database ได้",
    });
  }
}

// PUT /api/questions/[id] - Update question
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id || id.length < 10) {
    return jsonError("ไม่พบ ID ที่ถูกต้อง", 400);
  }

  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const rateLimited = enforceRateLimit(request, rateLimitConfigs.admin);
    if (rateLimited) return rateLimited;

    const admin = await requireAdmin();
    if (!admin) {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 401);
    }

    const body = await request.json();
    const validation = updateSchema.safeParse(body);
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
    if (text !== undefined) updateData.text = sanitizeHtml(text.trim());
    if (type !== undefined) updateData.type = type;
    if (level !== undefined) updateData.level = level;
    if (is18Plus !== undefined) updateData.is18Plus = is18Plus;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    const question = await prisma.question.update({
      where: { id },
      data: updateData,
    });

    return jsonOk({ question });
  } catch (error) {
    console.error("Error updating question:", error);
    return jsonError("ไม่สามารถแก้ไขคำถามได้", 500, {
      detail: "กรุณาลองใหม่อีกครั้ง",
    });
  }
}

// DELETE /api/questions/[id] - Delete question
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id || id.length < 10) {
    return jsonError("ไม่พบ ID ที่ถูกต้อง", 400);
  }

  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const rateLimited = enforceRateLimit(request, rateLimitConfigs.admin);
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
    console.error("Error deleting question:", error);
    return jsonError("ไม่สามารถลบคำถามได้", 500, {
      detail: "กรุณาลองใหม่อีกครั้ง",
    });
  }
}

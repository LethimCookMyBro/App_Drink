import { requireAdmin } from "@/lib/adminAuth";
import { enforceRateLimit, enforceSameOrigin, jsonError, jsonOk, mapServerError } from "@/lib/apiUtils";
import { toFeedbackReceiptResponse } from "@/lib/feedbackPrivacy";
import logger from "@/lib/logger";
import { rateLimitConfigs } from "@/lib/rateLimit";
import { feedbackStatusSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH - Update feedback status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const rateLimited = enforceRateLimit(request, rateLimitConfigs.admin);
    if (rateLimited) return rateLimited;

    const admin = await requireAdmin();
    if (!admin) {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 401);
    }

    const { id } = await params;
    const body = await request.json();

    const validation = feedbackStatusSchema.safeParse(body);
    if (!validation.success) {
      return jsonError("สถานะไม่ถูกต้อง", 400);
    }

    const { status } = validation.data;
    const { default: prisma } = await import("@/lib/db");

    const updatedFeedback = await prisma.feedback.update({
      where: { id },
      data: {
        status,
        resolvedAt: status === "RESOLVED" ? new Date() : null,
      },
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
      },
    });

    return jsonOk({
      success: true,
      feedback: toFeedbackReceiptResponse(updatedFeedback),
    });
  } catch (error) {
    logger.error("feedback.update.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "ไม่สามารถอัปเดตสถานะได้");
  }
}

// DELETE - Delete feedback
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const rateLimited = enforceRateLimit(request, rateLimitConfigs.admin);
    if (rateLimited) return rateLimited;

    const admin = await requireAdmin();
    if (!admin) {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 401);
    }

    const { id } = await params;
    const { default: prisma } = await import("@/lib/db");

    await prisma.feedback.delete({
      where: { id },
    });

    return jsonOk({ success: true, message: "ลบ feedback สำเร็จ" });
  } catch (error) {
    logger.error("feedback.delete.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "ไม่สามารถลบ feedback ได้");
  }
}

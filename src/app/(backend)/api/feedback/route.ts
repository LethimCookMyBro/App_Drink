import { requireAdmin } from "@/backend/adminAuth";
import { enforceRateLimit, enforceSameOrigin, jsonError, jsonOk, mapServerError } from "@/backend/apiUtils";
import { encryptFeedbackFields, toFeedbackReceiptResponse, toMaskedFeedbackResponse } from "@/backend/feedbackPrivacy";
import logger from "@/backend/logger";
import { rateLimitConfigs } from "@/backend/rateLimit";
import { feedbackSchema } from "@/shared/schemas";
import { verifyTurnstileToken } from "@/backend/integrations/cloudflareTurnstile";
import { TURNSTILE_ACTIONS } from "@/shared/integrations/cloudflareTurnstile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET - Get all feedback (for admin)
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 401);
    }

    const { default: prisma } = await import("@/backend/db");

    const feedbacks = await prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        type: true,
        title: true,
        details: true,
        contact: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
      },
    });

    return jsonOk({ feedbacks: feedbacks.map(toMaskedFeedbackResponse) });
  } catch (error) {
    logger.error("feedback.list.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "ไม่สามารถโหลด feedback ได้");
  }
}

// POST - Create new feedback
export async function POST(request: Request) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const rateLimited = enforceRateLimit(request, rateLimitConfigs.feedback);
    if (rateLimited) return rateLimited;

    const body = await request.json();

    // Validate input
    const validation = feedbackSchema.safeParse(body);
    if (!validation.success) {
      return jsonError(
        validation.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง",
        400,
      );
    }

    const turnstileCheck = await verifyTurnstileToken(
      request,
      body?.turnstileToken,
      TURNSTILE_ACTIONS.feedbackCreate,
    );
    if (!turnstileCheck.ok) {
      return jsonError(
        turnstileCheck.error || "การยืนยันความปลอดภัยไม่ผ่าน",
        turnstileCheck.status || 400,
      );
    }

    const { type, title, details, contact } = validation.data;

    const { default: prisma } = await import("@/backend/db");

    const feedback = await prisma.feedback.create({
      data: {
        type,
        ...encryptFeedbackFields({
          title,
          details: details ?? null,
          contact: contact ?? null,
        }),
      },
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
      },
    });

    return jsonOk(
      {
        success: true,
        message: "ส่ง feedback สำเร็จ",
        feedback: toFeedbackReceiptResponse(feedback),
      },
      201,
    );
  } catch (error) {
    logger.error("feedback.create.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "ไม่สามารถส่ง feedback ได้");
  }
}

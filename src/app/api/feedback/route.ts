import { z } from "zod";
import { requireAdmin } from "@/lib/adminAuth";
import { sanitizeHtml } from "@/lib/validation";
import { enforceRateLimit, enforceSameOrigin, jsonError, jsonOk } from "@/lib/apiUtils";
import { rateLimitConfigs } from "@/lib/rateLimit";

// Feedback validation schema
const feedbackSchema = z.object({
  type: z.enum(["BUG", "FEATURE"]),
  title: z
    .string()
    .min(3, "หัวข้อต้องมีอย่างน้อย 3 ตัวอักษร")
    .max(100),
  details: z.string().max(1000).optional(),
  contact: z.string().max(100).optional(),
});

// GET - Get all feedback (for admin)
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 401);
    }

    const { default: prisma } = await import("@/lib/db");

    const feedbacks = await prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return jsonOk({ feedbacks });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return jsonError("ไม่สามารถโหลด feedback ได้", 500, { feedbacks: [] });
  }
}

// POST - Create new feedback
export async function POST(request: Request) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const rateLimited = enforceRateLimit(request, rateLimitConfigs.standard);
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

    const { type, title, details, contact } = validation.data;

    const { default: prisma } = await import("@/lib/db");

    const feedback = await prisma.feedback.create({
      data: {
        type,
        title: sanitizeHtml(title.trim()),
        details: details ? sanitizeHtml(details.trim()) : null,
        contact: contact ? sanitizeHtml(contact.trim()) : null,
      },
    });

    return jsonOk(
      {
        success: true,
        message: "ส่ง feedback สำเร็จ",
        feedback,
      },
      201,
    );
  } catch (error) {
    console.error("Error creating feedback:", error);
    return jsonError("ไม่สามารถส่ง feedback ได้", 500);
  }
}

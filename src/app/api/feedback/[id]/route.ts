import { z } from "zod";
import { requireAdmin } from "@/lib/adminAuth";
import { enforceRateLimit, enforceSameOrigin, jsonError, jsonOk } from "@/lib/apiUtils";
import { rateLimitConfigs } from "@/lib/rateLimit";

// Status update schema
const statusSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"]),
});

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

    const validation = statusSchema.safeParse(body);
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
    });

    return jsonOk({ success: true, feedback: updatedFeedback });
  } catch (error) {
    console.error("Error updating feedback:", error);
    return jsonError("ไม่สามารถอัปเดตสถานะได้", 500);
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
    console.error("Error deleting feedback:", error);
    return jsonError("ไม่สามารถลบ feedback ได้", 500);
  }
}

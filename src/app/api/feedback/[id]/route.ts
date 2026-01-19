import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

// Status update schema
const statusSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"]),
});

// Helper to verify admin auth
async function verifyAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin-session");
  return !!token?.value;
}

// PATCH - Update feedback status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Verify admin authentication
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { error: "ไม่มีสิทธิ์เข้าถึง" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validation = statusSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "สถานะไม่ถูกต้อง" }, { status: 400 });
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

    return NextResponse.json({
      success: true,
      feedback: updatedFeedback,
    });
  } catch (error) {
    console.error("Error updating feedback:", error);
    return NextResponse.json(
      { error: "ไม่สามารถอัพเดทสถานะได้" },
      { status: 500 },
    );
  }
}

// DELETE - Delete feedback
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Verify admin authentication
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { error: "ไม่มีสิทธิ์เข้าถึง" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const { default: prisma } = await import("@/lib/db");

    await prisma.feedback.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "ลบ feedback สำเร็จ",
    });
  } catch (error) {
    console.error("Error deleting feedback:", error);
    return NextResponse.json(
      { error: "ไม่สามารถลบ feedback ได้" },
      { status: 500 },
    );
  }
}

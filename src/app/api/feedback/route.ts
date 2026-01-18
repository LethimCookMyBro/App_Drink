import { NextResponse } from "next/server";
import { z } from "zod";

// Feedback validation schema
const feedbackSchema = z.object({
  type: z.enum(["BUG", "FEATURE"]),
  title: z.string().min(3, "หัวข้อต้องมีอย่างน้อย 3 ตัวอักษร").max(100),
  details: z.string().max(1000).optional(),
  contact: z.string().max(100).optional(),
});

// GET - Get all feedback (for admin)
export async function GET() {
  try {
    const { default: prisma } = await import("@/lib/db");

    const feedbacks = await prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ feedbacks });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return NextResponse.json(
      { error: "ไม่สามารถโหลด feedback ได้", feedbacks: [] },
      { status: 500 },
    );
  }
}

// POST - Create new feedback
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const validation = feedbackSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    const { type, title, details, contact } = validation.data;

    const { default: prisma } = await import("@/lib/db");

    const feedback = await prisma.feedback.create({
      data: {
        type,
        title,
        details: details || null,
        contact: contact || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "ส่ง feedback สำเร็จ",
      feedback,
    });
  } catch (error) {
    console.error("Error creating feedback:", error);
    return NextResponse.json(
      { error: "ไม่สามารถส่ง feedback ได้" },
      { status: 500 },
    );
  }
}

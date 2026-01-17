import { NextRequest, NextResponse } from "next/server";

// GET /api/questions/[id] - Get single question
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id || id.length < 10) {
    return NextResponse.json({ error: "ไม่พบ ID ที่ถูกต้อง" }, { status: 400 });
  }

  try {
    const { default: prisma } = await import("@/lib/db");

    const question = await prisma.question.findUnique({
      where: { id },
    });

    if (!question) {
      return NextResponse.json({ error: "ไม่พบคำถาม" }, { status: 404 });
    }

    return NextResponse.json({ question });
  } catch (error) {
    console.error("Error fetching question:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาด", detail: "ไม่สามารถเชื่อมต่อ Database ได้" },
      { status: 500 },
    );
  }
}

// PUT /api/questions/[id] - Update question
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id || id.length < 10) {
    return NextResponse.json({ error: "ไม่พบ ID ที่ถูกต้อง" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { text, type, level, is18Plus, isActive, isPublic } = body;

    // Validate text if provided
    if (text !== undefined && (!text || text.trim().length < 5)) {
      return NextResponse.json(
        { error: "คำถามต้องมีอย่างน้อย 5 ตัวอักษร" },
        { status: 400 },
      );
    }

    // Validate type if provided
    const validTypes = ["QUESTION", "TRUTH", "DARE", "CHAOS", "VOTE"];
    if (type !== undefined && !validTypes.includes(type)) {
      return NextResponse.json(
        { error: "ประเภทคำถามไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    const { default: prisma } = await import("@/lib/db");

    // Check if question exists
    const existing = await prisma.question.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "ไม่พบคำถาม" }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (text !== undefined) updateData.text = text.trim();
    if (type !== undefined) updateData.type = type;
    if (level !== undefined) updateData.level = Math.min(3, Math.max(1, level));
    if (is18Plus !== undefined) updateData.is18Plus = is18Plus;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    const question = await prisma.question.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ question });
  } catch (error) {
    console.error("Error updating question:", error);
    return NextResponse.json(
      { error: "ไม่สามารถแก้ไขคำถามได้", detail: "กรุณาลองใหม่อีกครั้ง" },
      { status: 500 },
    );
  }
}

// DELETE /api/questions/[id] - Delete question
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id || id.length < 10) {
    return NextResponse.json({ error: "ไม่พบ ID ที่ถูกต้อง" }, { status: 400 });
  }

  try {
    const { default: prisma } = await import("@/lib/db");

    // Check if question exists first
    const existing = await prisma.question.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "ไม่พบคำถาม" }, { status: 404 });
    }

    // Soft delete by setting isActive to false (safer)
    await prisma.question.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: "ลบคำถามเรียบร้อย",
    });
  } catch (error) {
    console.error("Error deleting question:", error);
    return NextResponse.json(
      { error: "ไม่สามารถลบคำถามได้", detail: "กรุณาลองใหม่อีกครั้ง" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { QuestionType } from "@prisma/client";

// GET /api/questions - List questions with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as QuestionType | null;
    const level = searchParams.get("level");
    const is18Plus = searchParams.get("is18Plus");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = { isActive: true };

    if (type) where.type = type;
    if (level) where.level = parseInt(level);
    if (is18Plus !== null) where.is18Plus = is18Plus === "true";

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(100, limit),
        skip: offset,
      }),
      prisma.question.count({ where }),
    ]);

    return NextResponse.json({
      questions,
      total,
      limit,
      offset,
      hasMore: offset + questions.length < total,
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
  }
}

// POST /api/questions - Create custom question
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      text,
      type = "QUESTION",
      level = 2,
      is18Plus = false,
      isPublic = true,
    } = body;

    if (!text || text.trim().length < 5) {
      return NextResponse.json(
        { error: "Question text must be at least 5 characters" },
        { status: 400 }
      );
    }

    const validTypes: QuestionType[] = [
      "QUESTION",
      "TRUTH",
      "DARE",
      "CHAOS",
      "VOTE",
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid question type" },
        { status: 400 }
      );
    }

    const question = await prisma.question.create({
      data: {
        text: text.trim(),
        type,
        level: Math.min(3, Math.max(1, level)),
        is18Plus,
        isPublic,
      },
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    console.error("Error creating question:", error);
    return NextResponse.json(
      { error: "Failed to create question" },
      { status: 500 }
    );
  }
}

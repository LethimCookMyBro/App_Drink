import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { QuestionType } from "@prisma/client";

// GET /api/questions/random - Get random question(s)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as QuestionType | null;
    const level = searchParams.get("level");
    const is18Plus = searchParams.get("is18Plus") === "true";
    const count = Math.min(10, parseInt(searchParams.get("count") || "1"));
    const excludeIds =
      searchParams.get("exclude")?.split(",").filter(Boolean) || [];

    const where: any = { isActive: true };

    if (type) where.type = type;
    if (level) where.level = parseInt(level);
    if (!is18Plus) where.is18Plus = false; // Only filter if we want safe content
    if (excludeIds.length > 0) where.id = { notIn: excludeIds };

    // Get total count for random selection
    const total = await prisma.question.count({ where });

    if (total === 0) {
      return NextResponse.json({
        questions: [],
        message: "No questions found matching criteria",
      });
    }

    // Get random questions using skip
    const questions = [];
    const usedIndexes = new Set<number>();

    for (let i = 0; i < Math.min(count, total); i++) {
      let randomIndex: number;
      do {
        randomIndex = Math.floor(Math.random() * total);
      } while (usedIndexes.has(randomIndex) && usedIndexes.size < total);

      usedIndexes.add(randomIndex);

      const question = await prisma.question.findFirst({
        where,
        skip: randomIndex,
        take: 1,
      });

      if (question) {
        questions.push(question);

        // Increment usage count
        await prisma.question.update({
          where: { id: question.id },
          data: { usageCount: { increment: 1 } },
        });
      }
    }

    return NextResponse.json({
      questions,
      count: questions.length,
    });
  } catch (error) {
    console.error("Error fetching random questions:", error);
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
  }
}

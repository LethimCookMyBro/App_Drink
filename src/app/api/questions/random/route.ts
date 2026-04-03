import { NextRequest } from "next/server";
import { toPublicQuestion } from "@/lib/apiFilter";
import { jsonError, jsonOk } from "@/lib/apiUtils";
import logger from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUESTION_TYPES = new Set(["QUESTION", "TRUTH", "DARE", "CHAOS", "VOTE"]);

function shuffleArray<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function parseBoundedInt(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function parseOptionalLevel(value: string | null): number | null {
  if (!value) {
    return null;
  }

  return parseBoundedInt(value, 1, 1, 3);
}

// GET /api/questions/random - Get random question(s) for gameplay
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const is18Plus = searchParams.get("is18Plus") === "true";
  const count = parseBoundedInt(searchParams.get("count"), 1, 1, 10);
  const level = parseOptionalLevel(searchParams.get("level"));
  const excludeIds =
    searchParams
      .get("exclude")
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean) ?? [];

  if (type && !QUESTION_TYPES.has(type)) {
    return jsonError("ประเภทคำถามไม่ถูกต้อง", 400);
  }

  try {
    const { default: prisma } = await import("@/lib/db");

    const where: Record<string, unknown> = {
      isActive: true,
      isPublic: true,
    };
    if (type) {
      where.type = type;
    }
    if (level !== null) {
      where.level = { lte: level };
    }
    if (!is18Plus) {
      where.is18Plus = false;
    }
    if (excludeIds.length > 0) {
      where.id = { notIn: excludeIds };
    }

    const candidateLimit = Math.min(250, Math.max(count * 12, 24));
    const candidates = await prisma.question.findMany({
      where,
      orderBy: [{ usageCount: "asc" }, { updatedAt: "asc" }, { id: "asc" }],
      take: candidateLimit,
      select: {
        id: true,
        text: true,
        type: true,
        level: true,
        is18Plus: true,
      },
    });

    if (candidates.length === 0) {
      return jsonOk({
        questions: [],
        count: 0,
        source: "db",
        message: "No questions found matching criteria",
      });
    }

    const selectedQuestions = shuffleArray(candidates).slice(0, count);
    const selectedIds = selectedQuestions.map((question) => question.id);

    if (selectedIds.length > 0) {
      await prisma.question.updateMany({
        where: {
          id: {
            in: selectedIds,
          },
        },
        data: {
          usageCount: {
            increment: 1,
          },
        },
      });
    }

    return jsonOk({
      questions: selectedQuestions.map(toPublicQuestion),
      count: selectedQuestions.length,
      source: "db",
    });
  } catch (error) {
    logger.error("questions.random.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return jsonError("ไม่สามารถโหลดคำถามได้ในขณะนี้", 500);
  }
}

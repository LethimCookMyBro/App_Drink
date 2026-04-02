import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import {
  enforceRateLimit,
  enforceSameOrigin,
  jsonError,
  jsonOk,
} from "@/lib/apiUtils";
import { rateLimitConfigs } from "@/lib/rateLimit";
import { questionSchema, sanitizeHtml } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUESTION_TYPES = new Set(["QUESTION", "TRUTH", "DARE", "CHAOS", "VOTE"]);

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

function parseBooleanFlag(value: string | null): boolean | null | "invalid" {
  if (value === null) {
    return null;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }

  return "invalid";
}

// GET /api/questions - List questions for admin management
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 401);
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const is18Plus = parseBooleanFlag(searchParams.get("is18Plus"));

    if (type && !QUESTION_TYPES.has(type)) {
      return jsonError("ประเภทคำถามไม่ถูกต้อง", 400);
    }

    if (is18Plus === "invalid") {
      return jsonError("ค่า is18Plus ไม่ถูกต้อง", 400);
    }

    const levelParam = searchParams.get("level");
    const level = levelParam ? parseBoundedInt(levelParam, 1, 1, 3) : null;
    const limit = parseBoundedInt(searchParams.get("limit"), 50, 1, 1000);
    const offset = parseBoundedInt(searchParams.get("offset"), 0, 0, 100000);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const where: Record<string, unknown> = {};
    if (!includeInactive) {
      where.isActive = true;
    }
    if (type) {
      where.type = type;
    }
    if (level !== null) {
      where.level = { lte: level };
    }
    if (is18Plus !== null) {
      where.is18Plus = is18Plus;
    }

    const { default: prisma } = await import("@/lib/db");
    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit,
        skip: offset,
      }),
      prisma.question.count({ where }),
    ]);

    return jsonOk({
      questions,
      total,
      limit,
      offset,
      hasMore: offset + questions.length < total,
      source: "db",
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    return jsonError("ไม่สามารถโหลดคำถามได้ในขณะนี้", 500);
  }
}

// POST /api/questions - Create custom question
export async function POST(request: NextRequest) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const rateLimited = enforceRateLimit(request, rateLimitConfigs.admin);
    if (rateLimited) return rateLimited;

    const admin = await requireAdmin();
    if (!admin) {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 401);
    }

    const body = await request.json();
    const validation = questionSchema.safeParse(body);
    if (!validation.success) {
      return jsonError(
        validation.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง",
        400,
      );
    }

    const { text, type, level, is18Plus } = validation.data;
    const isPublic =
      typeof body.isPublic === "boolean" ? body.isPublic : true;

    const { default: prisma } = await import("@/lib/db");

    const question = await prisma.question.create({
      data: {
        text: sanitizeHtml(text.trim()),
        type,
        level: Math.min(3, Math.max(1, level)),
        is18Plus,
        isPublic,
        isActive: true,
        createdBy: admin.id,
      },
    });

    return jsonOk({ question }, 201);
  } catch (error) {
    console.error("Error creating question:", error);
    return jsonError("ไม่สามารถสร้างคำถามได้ในขณะนี้", 500);
  }
}

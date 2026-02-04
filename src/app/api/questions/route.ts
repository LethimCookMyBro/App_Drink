import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { enforceRateLimit, enforceSameOrigin, jsonError, jsonOk } from "@/lib/apiUtils";
import { rateLimitConfigs } from "@/lib/rateLimit";
import { questionSchema, sanitizeHtml } from "@/lib/validation";

// Fallback questions when database is offline - organized by type and level
const fallbackQuestions = [
  // QUESTION type - Level 1
  {
    id: "fb-q1",
    text: "ถ้าชนะ lottery 100 ล้าน จะทำอะไรเป็นอย่างแรก?",
    type: "QUESTION",
    level: 1,
    is18Plus: false,
  },
  {
    id: "fb-q2",
    text: "ถ้าได้กลับไปแก้อดีต จะแก้เรื่องอะไร?",
    type: "QUESTION",
    level: 1,
    is18Plus: false,
  },
  {
    id: "fb-q3",
    text: "อาหารที่ทานได้ตลอดชีวิตคืออะไร?",
    type: "QUESTION",
    level: 1,
    is18Plus: false,
  },
  // QUESTION type - Level 2
  {
    id: "fb-q4",
    text: "เคยโกหกเพื่อนในวงนี้เรื่องอะไร?",
    type: "QUESTION",
    level: 2,
    is18Plus: false,
  },
  {
    id: "fb-q5",
    text: "ความลับที่ไม่เคยบอกใครคืออะไร?",
    type: "QUESTION",
    level: 2,
    is18Plus: false,
  },
  {
    id: "fb-q6",
    text: "แอบชอบใครในวงนี้หรือเปล่า?",
    type: "QUESTION",
    level: 2,
    is18Plus: false,
  },
  // QUESTION type - Level 3
  {
    id: "fb-q7",
    text: "เคยทำอะไรน่าอายที่สุด?",
    type: "QUESTION",
    level: 3,
    is18Plus: false,
  },
  {
    id: "fb-q8",
    text: "ถ้าต้องเลือกแฟนจากคนในวงนี้?",
    type: "QUESTION",
    level: 3,
    is18Plus: false,
  },

  // VOTE type - Level 1, 2, 3
  {
    id: "fb-v1",
    text: "ใครโมโหง่ายที่สุดในวง?",
    type: "VOTE",
    level: 1,
    is18Plus: false,
  },
  {
    id: "fb-v2",
    text: "ใครน่าจะเป็นเศรษฐีในอนาคต?",
    type: "VOTE",
    level: 1,
    is18Plus: false,
  },
  {
    id: "fb-v3",
    text: "ใครหล่อ/สวยที่สุดในวง?",
    type: "VOTE",
    level: 2,
    is18Plus: false,
  },
  {
    id: "fb-v4",
    text: "ใครจะแต่งงานเป็นคนแรก?",
    type: "VOTE",
    level: 2,
    is18Plus: false,
  },
  {
    id: "fb-v5",
    text: "ใครน่าจะขี้โกงที่สุด?",
    type: "VOTE",
    level: 3,
    is18Plus: false,
  },
  {
    id: "fb-v6",
    text: "ใครแอบหลอกลวงเก่งที่สุด?",
    type: "VOTE",
    level: 3,
    is18Plus: false,
  },

  // TRUTH type - Level 1, 2, 3
  {
    id: "fb-t1",
    text: "เคยแอบชอบเพื่อนสนิทไหม?",
    type: "TRUTH",
    level: 1,
    is18Plus: false,
  },
  {
    id: "fb-t2",
    text: "เคยโกหกพ่อแม่เรื่องอะไร?",
    type: "TRUTH",
    level: 1,
    is18Plus: false,
  },
  {
    id: "fb-t3",
    text: "เคยนินทาใครในวงนี้บ้าง?",
    type: "TRUTH",
    level: 2,
    is18Plus: false,
  },
  {
    id: "fb-t4",
    text: "ความลับที่กลัวว่าจะถูกเปิดเผยคืออะไร?",
    type: "TRUTH",
    level: 2,
    is18Plus: false,
  },
  {
    id: "fb-t5",
    text: "เคยแอบอิจฉาใครในวงนี้บ้าง?",
    type: "TRUTH",
    level: 3,
    is18Plus: false,
  },
  {
    id: "fb-t6",
    text: "เคยทำอะไรผิดกฎหมายบ้าง?",
    type: "TRUTH",
    level: 3,
    is18Plus: false,
  },

  // DARE type - Level 1, 2, 3
  {
    id: "fb-d1",
    text: "โทรหาคนสุดท้ายในประวัติโทรแล้วบอกรัก",
    type: "DARE",
    level: 1,
    is18Plus: false,
  },
  {
    id: "fb-d2",
    text: "อัด Story แปลกๆ 1 อัน ห้ามลบ 24 ชม.",
    type: "DARE",
    level: 1,
    is18Plus: false,
  },
  {
    id: "fb-d3",
    text: "ให้คนขวามือเลือกเพลงแล้วร้องเต็มเพลง",
    type: "DARE",
    level: 2,
    is18Plus: false,
  },
  {
    id: "fb-d4",
    text: "ให้คนในวงเลือกโพสท่ายากๆ แล้วถ่ายรูป",
    type: "DARE",
    level: 2,
    is18Plus: false,
  },
  {
    id: "fb-d5",
    text: "เต้นกลางวงแบบไม่มียางอาย",
    type: "DARE",
    level: 3,
    is18Plus: false,
  },
  {
    id: "fb-d6",
    text: "ให้คนซ้ายมือเขียนอะไรก็ได้บนหน้า",
    type: "DARE",
    level: 3,
    is18Plus: false,
  },

  // CHAOS type - Level 1, 2, 3
  {
    id: "fb-c1",
    text: "ทุกคนดื่ม! ใครไม่ดื่มต้องตอบคำถาม",
    type: "CHAOS",
    level: 1,
    is18Plus: false,
  },
  {
    id: "fb-c2",
    text: "คนที่มือถือแบตน้อยที่สุดต้องดื่ม!",
    type: "CHAOS",
    level: 1,
    is18Plus: false,
  },
  {
    id: "fb-c3",
    text: "แข่งเป่ายิงฉุบ แพ้ดื่ม!",
    type: "CHAOS",
    level: 2,
    is18Plus: false,
  },
  {
    id: "fb-c4",
    text: "คนที่กดมือถือก่อนต้องดื่ม!",
    type: "CHAOS",
    level: 2,
    is18Plus: false,
  },
  {
    id: "fb-c5",
    text: "จิ้มคนที่ต้องดื่ม 3 แก้วเลย!",
    type: "CHAOS",
    level: 3,
    is18Plus: false,
  },
  {
    id: "fb-c6",
    text: "ทุกคนแข่งดื่ม คนสุดท้ายต้องตอบคำถาม!",
    type: "CHAOS",
    level: 3,
    is18Plus: false,
  },
  // 18+ samples
  {
    id: "fb-18p-t1",
    text: "18+ Sample (Truth): Share your spiciest secret.",
    type: "TRUTH",
    level: 3,
    is18Plus: true,
  },
  {
    id: "fb-18p-d1",
    text: "18+ Sample (Dare): Do a bold challenge for the group.",
    type: "DARE",
    level: 3,
    is18Plus: true,
  },

];

// Helper to filter fallback questions
function getFilteredFallback(
  type: string | null,
  level: string | null,
  is18Plus: string | null
) {
  let filtered = [...fallbackQuestions];

  if (type) {
    filtered = filtered.filter((q) => q.type === type);
  }
  if (level) {
    filtered = filtered.filter((q) => q.level <= parseInt(level));
  }
  if (is18Plus !== null && is18Plus !== "true") {
    filtered = filtered.filter((q) => !q.is18Plus);
  }

  return filtered;
}

// GET /api/questions - List questions with filters
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const level = searchParams.get("level");
  const is18Plus = searchParams.get("is18Plus");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    // Try to dynamically import and use Prisma
    const { default: prisma } = await import("@/lib/db");

    const where: Record<string, unknown> = { isActive: true };
    if (type) where.type = type;
    if (level) where.level = { lte: parseInt(level) };
    if (is18Plus !== null) where.is18Plus = is18Plus === "true";

    const safeLimit = Math.min(1000, Math.max(1, limit));
    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: safeLimit,
        skip: offset,
      }),
      prisma.question.count({ where }),
    ]);

    if (total === 0) {
      const totalAll = await prisma.question.count({
        where: { isActive: true },
      });
      if (totalAll === 0) {
        const filtered = getFilteredFallback(type, level, is18Plus);
        const paged = filtered.slice(offset, offset + safeLimit);
        return jsonOk({
          questions: paged,
          total: filtered.length,
          limit: safeLimit,
          offset,
          hasMore: offset + paged.length < filtered.length,
          fallback: true,
          emptyDb: true,
          message:
            "เนเธเนเธเนเธญเธกเธนเธฅเธ•เธฑเธงเธญเธขเนเธฒเธ (Database ว่างอยู่)",
        });
      }
    }

    return jsonOk({
      questions,
      total,
      limit: safeLimit,
      offset,
      hasMore: offset + questions.length < total,
    });
  } catch (error) {
    console.error("Database error, using fallback:", error);

    // Return fallback questions when database is offline
    const filtered = getFilteredFallback(type, level, is18Plus);
    const paged = filtered.slice(offset, offset + limit);

    return jsonOk({
      questions: paged,
      total: filtered.length,
      limit,
      offset,
      hasMore: offset + paged.length < filtered.length,
      fallback: true,
      message: "ใช้ข้อมูลตัวอย่าง (กรุณาเชื่อมต่อ Database เพื่อใช้งานจริง)",
    });
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
      return jsonError("??????????????????", 401);
    }

    const body = await request.json();
    const validation = questionSchema.safeParse(body);
    if (!validation.success) {
      return jsonError(
        validation.error.issues[0]?.message || "????????????????",
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
    return jsonError(
      "??????????????????????",
      500,
      {
        detail:
          "?????????????? Database ???? (Start PostgreSQL ??????: npx prisma db push)",
      },
    );
  }
}

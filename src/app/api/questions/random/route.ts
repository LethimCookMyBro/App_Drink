import { NextRequest, NextResponse } from "next/server";

// Fallback questions when database is offline
const fallbackQuestions = [
  // QUESTION type
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
    text: "เคยโกหกเพื่อนในวงนี้เรื่องอะไร?",
    type: "QUESTION",
    level: 2,
    is18Plus: false,
  },
  {
    id: "fb-q4",
    text: "ความลับที่ไม่เคยบอกใครคืออะไร?",
    type: "QUESTION",
    level: 2,
    is18Plus: false,
  },
  {
    id: "fb-q5",
    text: "เคยทำอะไรน่าอายที่สุด?",
    type: "QUESTION",
    level: 3,
    is18Plus: false,
  },
  {
    id: "fb-q6",
    text: "ถ้าต้องเลือกแฟนจากคนในวงนี้?",
    type: "QUESTION",
    level: 3,
    is18Plus: false,
  },
  // VOTE type
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
    text: "ใครน่าจะขี้โกงที่สุด?",
    type: "VOTE",
    level: 3,
    is18Plus: false,
  },
  // TRUTH type
  {
    id: "fb-t1",
    text: "เคยแอบชอบเพื่อนสนิทไหม?",
    type: "TRUTH",
    level: 1,
    is18Plus: false,
  },
  {
    id: "fb-t2",
    text: "เคยนินทาใครในวงนี้บ้าง?",
    type: "TRUTH",
    level: 2,
    is18Plus: false,
  },
  {
    id: "fb-t3",
    text: "เคยแอบอิจฉาใครในวงนี้บ้าง?",
    type: "TRUTH",
    level: 3,
    is18Plus: false,
  },
  // DARE type
  {
    id: "fb-d1",
    text: "โทรหาคนสุดท้ายในประวัติโทรแล้วบอกรัก",
    type: "DARE",
    level: 1,
    is18Plus: false,
  },
  {
    id: "fb-d2",
    text: "ให้คนขวามือเลือกเพลงแล้วร้องเต็มเพลง",
    type: "DARE",
    level: 2,
    is18Plus: false,
  },
  {
    id: "fb-d3",
    text: "เต้นกลางวงแบบไม่มียางอาย",
    type: "DARE",
    level: 3,
    is18Plus: false,
  },
  // CHAOS type
  {
    id: "fb-c1",
    text: "ทุกคนดื่ม! ใครไม่ดื่มต้องตอบคำถาม",
    type: "CHAOS",
    level: 1,
    is18Plus: false,
  },
  {
    id: "fb-c2",
    text: "แข่งเป่ายิงฉุบ แพ้ดื่ม!",
    type: "CHAOS",
    level: 2,
    is18Plus: false,
  },
  {
    id: "fb-c3",
    text: "จิ้มคนที่ต้องดื่ม 3 แก้วเลย!",
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

// Shuffle array helper
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// GET /api/questions/random - Get random question(s)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const level = searchParams.get("level");
  const is18Plus = searchParams.get("is18Plus") === "true";
  const count = Math.min(10, parseInt(searchParams.get("count") || "1"));
  const excludeIds =
    searchParams.get("exclude")?.split(",").filter(Boolean) || [];

  try {
    // Dynamic import to prevent module crash
    const { default: prisma } = await import("@/lib/db");

    const where: Record<string, unknown> = { isActive: true };
    if (type) where.type = type;
    if (level) where.level = { lte: parseInt(level) };
    if (!is18Plus) where.is18Plus = false;
    if (excludeIds.length > 0) where.id = { notIn: excludeIds };

    const total = await prisma.question.count({ where });

    if (total === 0) {
      return NextResponse.json({
        questions: [],
        message: "No questions found matching criteria",
      });
    }

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
    console.error("Database error, using fallback:", error);

    // Return fallback random questions
    let filtered = [...fallbackQuestions];
    if (type) filtered = filtered.filter((q) => q.type === type);
    if (level) filtered = filtered.filter((q) => q.level <= parseInt(level));
    if (!is18Plus) filtered = filtered.filter((q) => !q.is18Plus);
    filtered = filtered.filter((q) => !excludeIds.includes(q.id));

    const shuffled = shuffleArray(filtered);
    const selected = shuffled.slice(0, count);

    return NextResponse.json({
      questions: selected,
      count: selected.length,
      fallback: true,
      message: "ใช้ข้อมูลตัวอย่าง (กรุณาเชื่อมต่อ Database เพื่อใช้งานจริง)",
    });
  }
}

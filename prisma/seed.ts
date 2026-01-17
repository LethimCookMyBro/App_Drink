import { PrismaClient, QuestionType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Thai Questions Data
const questions = [
  // ===============================
  // Level 1 - Chill (ชิลล์ๆ)
  // ===============================
  {
    text: "เคยโกหกแม่เรื่องอะไรบ้าง?",
    type: "QUESTION" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "อาหารที่แอบกินคนเดียวไม่ยอมแบ่งใครคืออะไร?",
    type: "QUESTION" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "ถ้าได้ย้อนเวลากลับไปแก้ไขอะไรได้ 1 อย่าง จะแก้อะไร?",
    type: "QUESTION" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "เพลงอะไรที่ชอบร้องตอนอาบน้ำ?",
    type: "QUESTION" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "นิสัยแย่ๆ ที่ไม่ยอมแก้คืออะไร?",
    type: "QUESTION" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "ของที่ซื้อแล้วเสียดายเงินที่สุดคืออะไร?",
    type: "QUESTION" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "ถ้าโดนหวยรางวัลที่ 1 อย่างแรกที่จะทำคืออะไร?",
    type: "QUESTION" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "เรื่องโง่ๆ ที่ทำตอนเด็กคืออะไร?",
    type: "QUESTION" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "ฝันร้ายที่จำได้ชัดที่สุดคืออะไร?",
    type: "QUESTION" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "ถ้าเลือกได้ อยากมีซูเปอร์พาวเวอร์อะไร?",
    type: "QUESTION" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "อะไรที่กลัวแต่ไม่กล้าบอกใคร?",
    type: "QUESTION" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "หนังเรื่องไหนที่ร้องไห้หนักมาก?",
    type: "QUESTION" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "ถ้าต้องกินอาหารอย่างเดียวตลอดชีวิต เลือกอะไร?",
    type: "QUESTION" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "เคยโดดงาน/โดดเรียนไปทำอะไร?",
    type: "QUESTION" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "สิ่งที่คนอื่นทำแล้วหงุดหงิดที่สุดคืออะไร?",
    type: "QUESTION" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "ชื่อเล่นสมัยเด็กคืออะไร?",
    type: "QUESTION" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "เคยแกล้งป่วยหนีเรียน/งานบ้างไหม?",
    type: "QUESTION" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "สัตว์อะไรที่กลัวมากที่สุด?",
    type: "QUESTION" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "ถ้าเป็นคนดังได้ 1 วัน อยากเป็นใคร?",
    type: "QUESTION" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "Guilty pleasure ที่ไม่บอกใครคืออะไร?",
    type: "QUESTION" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "เพลงที่ฟังแล้วอยากร้องไห้คือเพลงอะไร?",
    type: "QUESTION" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "ถ้าต้องย้ายไปอยู่ต่างประเทศ เลือกที่ไหน?",
    type: "QUESTION" as QuestionType,
    level: 1,
    is18Plus: false,
  },

  // ===============================
  // Level 2 - Mid (เริ่มเดือด)
  // ===============================
  {
    text: "เรื่องที่ไม่เคยบอกใครในวงนี้?",
    type: "QUESTION" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "เคยแอบชอบเพื่อนในกลุ่มไหม?",
    type: "QUESTION" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "ความลับที่รู้แล้วจะอึ้งคนในวง?",
    type: "QUESTION" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "คนในวงที่เคยนินทาลับหลังคือใคร?",
    type: "QUESTION" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "เคยโกหกเรื่องใหญ่ๆ แล้วยังไม่ถูกจับได้?",
    type: "QUESTION" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "เรื่องที่ทำให้อายที่สุดในชีวิตคืออะไร?",
    type: "QUESTION" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "เคยแอบดูมือถือคนอื่นไหม?",
    type: "QUESTION" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "คนในวงที่เชื่อใจน้อยที่สุดคือใคร?",
    type: "QUESTION" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "เคยโกหกแฟนเรื่องอะไรที่หนักสุด?",
    type: "QUESTION" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "ถ้าต้องเลือกคนในวงไปติดเกาะด้วย เลือกใคร?",
    type: "QUESTION" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "เรื่องที่เสียใจที่สุดที่เคยทำกับเพื่อน?",
    type: "QUESTION" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "ถ้าต้องตัดเพื่อนออกไป 1 คน เลือกใคร?",
    type: "QUESTION" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "เคยขโมยอะไรมาบ้าง? (แม้แต่เล็กน้อย)",
    type: "QUESTION" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "ความสัมพันธ์ที่ล้มเหลวที่สุดคืออะไร?",
    type: "QUESTION" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "เคยแอบรักใครที่รักไม่ได้บ้างไหม?",
    type: "QUESTION" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "คนแรกที่จะโทรหาถ้ามีปัญหาคือใคร?",
    type: "QUESTION" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "เคยทำอะไรแย่ๆ กับคนที่รักแล้วเสียใจ?",
    type: "QUESTION" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "ความลับเรื่องเงินที่ไม่เคยบอกใคร?",
    type: "QUESTION" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "เคยได้ยินเพื่อนนินทาแล้วแกล้งไม่รู้ไหม?",
    type: "QUESTION" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "ใครในวงที่คิดว่าจะประสบความสำเร็จที่สุด?",
    type: "QUESTION" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "เรื่องที่ไม่อยากให้พ่อแม่รู้คืออะไร?",
    type: "QUESTION" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "คนในวงที่อยากให้เป็นพี่/น้องจริงๆ คือใคร?",
    type: "QUESTION" as QuestionType,
    level: 2,
    is18Plus: false,
  },

  // ===============================
  // Level 3 - Spicy 18+ (แตกแน่)
  // ===============================
  {
    text: "เคยทำอะไรแย่ๆ แล้วไม่เคยสารภาพ?",
    type: "QUESTION" as QuestionType,
    level: 3,
    is18Plus: true,
  },
  {
    text: "คนในวงที่คุณจะเลือกถ้าต้องติดเกาะด้วยกันคือใคร?",
    type: "QUESTION" as QuestionType,
    level: 3,
    is18Plus: true,
  },
  {
    text: "เรื่องที่ไม่อยากให้แฟนรู้ที่สุดคืออะไร?",
    type: "QUESTION" as QuestionType,
    level: 3,
    is18Plus: true,
  },
  {
    text: "เคยนอกใจใครบ้างไหม? (ไม่ต้องบอกชื่อ)",
    type: "QUESTION" as QuestionType,
    level: 3,
    is18Plus: true,
  },
  {
    text: "ถ้าต้องเลือกจีบคนในวงได้ 1 คน เลือกใคร?",
    type: "QUESTION" as QuestionType,
    level: 3,
    is18Plus: true,
  },
  {
    text: "อะไรที่ทำตอนเมาแล้วอายมากที่สุด?",
    type: "QUESTION" as QuestionType,
    level: 3,
    is18Plus: true,
  },
  {
    text: "เคยแอบส่องโซเชียลแฟนเก่าบ่อยแค่ไหน?",
    type: "QUESTION" as QuestionType,
    level: 3,
    is18Plus: true,
  },
  {
    text: "ความสัมพันธ์ที่ซับซ้อนที่สุดที่เคยมีคืออะไร?",
    type: "QUESTION" as QuestionType,
    level: 3,
    is18Plus: true,
  },
  {
    text: "เคยเอาเรื่องของเพื่อนไปบอกคนอื่นบ้างไหม?",
    type: "QUESTION" as QuestionType,
    level: 3,
    is18Plus: true,
  },
  {
    text: "ถ้าต้องเลือกคนในวงมาเป็นเพื่อนตลอดชีวิต 1 คน?",
    type: "QUESTION" as QuestionType,
    level: 3,
    is18Plus: true,
  },
  {
    text: "เคยทำอะไรที่ผิดกฎหมายบ้างไหม?",
    type: "QUESTION" as QuestionType,
    level: 3,
    is18Plus: true,
  },
  {
    text: "ใครคือแฟนเก่าที่ยังไม่ลืม?",
    type: "QUESTION" as QuestionType,
    level: 3,
    is18Plus: true,
  },
  {
    text: "เรื่องที่ทำตอนเมาแล้วยังจำได้ขำๆ คืออะไร?",
    type: "QUESTION" as QuestionType,
    level: 3,
    is18Plus: true,
  },
  {
    text: "เคยโกหกแฟนว่าไปไหน แต่จริงๆ ไปที่อื่น?",
    type: "QUESTION" as QuestionType,
    level: 3,
    is18Plus: true,
  },
  {
    text: "ถ้าแฟนมาถามว่ามีใครอื่นไหม จะตอบว่าอะไร?",
    type: "QUESTION" as QuestionType,
    level: 3,
    is18Plus: true,
  },
  {
    text: "เคยมีความสัมพันธ์ที่พ่อแม่ไม่รู้บ้างไหม?",
    type: "QUESTION" as QuestionType,
    level: 3,
    is18Plus: true,
  },
  {
    text: "อะไรที่ทำให้หมดรักคนๆ นึงได้เลย?",
    type: "QUESTION" as QuestionType,
    level: 3,
    is18Plus: true,
  },
  {
    text: "Red flag ที่ใหญ่ที่สุดของตัวเองคืออะไร?",
    type: "QUESTION" as QuestionType,
    level: 3,
    is18Plus: true,
  },
  {
    text: "เคยบล็อคคนที่รู้จักในกลุ่มนี้ไหม?",
    type: "QUESTION" as QuestionType,
    level: 3,
    is18Plus: true,
  },
  {
    text: "คนในวงที่คิดว่าจะเลิกกับแฟนเร็วสุดคือใคร?",
    type: "QUESTION" as QuestionType,
    level: 3,
    is18Plus: true,
  },
  {
    text: "เคยกลับไปหาแฟนเก่าตอนเมาบ้างไหม?",
    type: "QUESTION" as QuestionType,
    level: 3,
    is18Plus: true,
  },
  {
    text: "ความลับที่ถ้าบอกแฟนจะโดนเลิกทันทีคืออะไร?",
    type: "QUESTION" as QuestionType,
    level: 3,
    is18Plus: true,
  },

  // ===============================
  // Truth (ความจริง)
  // ===============================
  {
    text: "เคยโกหกแฟนเรื่องหนักที่สุด?",
    type: "TRUTH" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "ความลับที่ไม่เคยบอกใครคืออะไร?",
    type: "TRUTH" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "เคยแอบชอบเพื่อนในกลุ่มบ้างไหม?",
    type: "TRUTH" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "เรื่องที่อายที่สุดในชีวิตคืออะไร?",
    type: "TRUTH" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "เคยนินทาใครในวงบ้างไหม?",
    type: "TRUTH" as QuestionType,
    level: 2,
    is18Plus: false,
  },

  // ===============================
  // Dares (คำท้า)
  // ===============================
  {
    text: "โทรหาแฟนเก่าแล้วบอกว่าคิดถึงหมาของเขา",
    type: "DARE" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "ทักแชทหาคนที่ไม่ได้คุยมา 1 ปี ด้วยสติกเกอร์แปลกๆ",
    type: "DARE" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "โพสต์ IG Story ร้องเพลงสักท่อน",
    type: "DARE" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "ให้คนในวงเลือกผู้ติดตามใน IG แล้วกดไลค์รูปเก่าสุด",
    type: "DARE" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "โทรหาพ่อหรือแม่ บอกว่ารักมากๆ",
    type: "DARE" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "ทักแชทหาคนสุ่มใน IG ขอเบอร์โทร",
    type: "DARE" as QuestionType,
    level: 3,
    is18Plus: true,
  },
  {
    text: "ให้ทุกคนในวงอ่านแชทกับคนที่คุยล่าสุด",
    type: "DARE" as QuestionType,
    level: 3,
    is18Plus: true,
  },
  {
    text: "โพสต์รูปเก่าที่อายที่สุดลง story",
    type: "DARE" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "ทักหาเพื่อนที่ไม่สนิท ชวนไปกินข้าว",
    type: "DARE" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "แสดงรูปล่าสุดที่บันทึกไว้ในมือถือ",
    type: "DARE" as QuestionType,
    level: 2,
    is18Plus: false,
  },

  // ===============================
  // Chaos Mode Rules
  // ===============================
  {
    text: "ใครที่ใส่เสื้อสีดำ → ดื่มให้หมดแก้ว!",
    type: "CHAOS" as QuestionType,
    level: 3,
    is18Plus: false,
  },
  {
    text: "คนที่อายุน้อยที่สุด → เลือกคนดื่ม 2 แก้ว",
    type: "CHAOS" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "คนที่ถือมือถือ → ดื่มทันทีแล้ววางมือถือ",
    type: "CHAOS" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "ทุกคนในวง → ดื่มพร้อมกัน 3 วิ!",
    type: "CHAOS" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "คนที่หัวเราะก่อน → โดนจี้ 10 ครั้ง",
    type: "CHAOS" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "คนที่นั่งซ้ายสุด → เล่าเรื่องน่าอายให้ฟัง",
    type: "CHAOS" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "คนที่มาสายวันนี้ → ดื่ม 2 แก้ว",
    type: "CHAOS" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "คนที่เช็คมือถือล่าสุด → วางมือถือไว้กลางโต๊ะ 5 นาที",
    type: "CHAOS" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "คนที่ผมยาวสุด → เลือกคนดื่มด้วย 1 คน",
    type: "CHAOS" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "คนที่หัวเราะเสียงดังสุด → ทำหน้าตลกให้ทุกคนดู",
    type: "CHAOS" as QuestionType,
    level: 1,
    is18Plus: false,
  },

  // ===============================
  // Vote Questions (โหมดโหวต)
  // ===============================
  {
    text: "ใครมีเกณฑ์จะเป็นคนรวยที่สุด?",
    type: "VOTE" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "ใครเป็นคนจริงใจที่สุดในวง?",
    type: "VOTE" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "ใครจะแต่งงานก่อน?",
    type: "VOTE" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "ใครเป็นคนปากไม่ตรงใจที่สุด?",
    type: "VOTE" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "ใครชอบนินทาที่สุด?",
    type: "VOTE" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "ใครมีเกณฑ์โดนแฟนทิ้ง?",
    type: "VOTE" as QuestionType,
    level: 2,
    is18Plus: false,
  },
  {
    text: "ใครน่าจะเป็นพ่อที่ดี?",
    type: "VOTE" as QuestionType,
    level: 1,
    is18Plus: false,
  },
  {
    text: "ใครจะบ้านแตกก่อน?",
    type: "VOTE" as QuestionType,
    level: 3,
    is18Plus: true,
  },
  {
    text: "ใครน่าจะมีแฟนมากที่สุด?",
    type: "VOTE" as QuestionType,
    level: 2,
    is18Plus: true,
  },
  {
    text: "ใครจะติดคุกก่อน?",
    type: "VOTE" as QuestionType,
    level: 3,
    is18Plus: true,
  },
];

async function main() {
  console.log("🌱 Starting seed...");

  // Clear existing questions
  await prisma.question.deleteMany();
  console.log("🗑️  Cleared existing questions");

  // Insert questions
  const created = await prisma.question.createMany({
    data: questions.map((q) => ({
      ...q,
      isPublic: true,
      isActive: true,
    })),
  });
  console.log(`✅ Created ${created.count} questions`);

  // Create default app settings
  await prisma.appSettings.upsert({
    where: { id: "app_settings" },
    update: {},
    create: {
      id: "app_settings",
      is18PlusEnabled: true,
      defaultDifficulty: 3,
      defaultMaxPlayers: 8,
      defaultTimerSeconds: 30,
    },
  });
  console.log("⚙️  Created app settings");

  console.log("🎉 Seed completed!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

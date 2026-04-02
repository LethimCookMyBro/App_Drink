import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

const dbUrl =
  process.env.DATABASE_PUBLIC_URL?.trim() || process.env.DATABASE_URL?.trim();

if (!dbUrl) {
  throw new Error("DATABASE_PUBLIC_URL or DATABASE_URL is required");
}

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

// Thai Questions Data
const questions = [
  // ===============================
  // Level 1 - Chill (ชิลล์ๆ)
  // ===============================
  {
    text: "เคยโกหกแม่เรื่องอะไรบ้าง?",
    type: "QUESTION",
    level: 1,
    is18Plus: false,
  },
  {
    text: "อาหารที่แอบกินคนเดียวไม่ยอมแบ่งใครคืออะไร?",
    type: "QUESTION",
    level: 1,
    is18Plus: false,
  },
  {
    text: "ถ้าได้ย้อนเวลากลับไปแก้ไขอะไรได้ 1 อย่าง จะแก้อะไร?",
    type: "QUESTION",
    level: 1,
    is18Plus: false,
  },
  {
    text: "เพลงที่ฟังแล้วร้องไห้คือเพลงอะไร?",
    type: "QUESTION",
    level: 1,
    is18Plus: false,
  },
  {
    text: "ความลับที่ไม่เคยบอกใครเลยคืออะไร?",
    type: "TRUTH",
    level: 1,
    is18Plus: false,
  },
  {
    text: "ร้องเพลงที่กำลังฮิตตอนนี้ให้เพื่อนฟัง",
    type: "DARE",
    level: 1,
    is18Plus: false,
  },
  {
    text: "โหวต: ใครในวงดูแล้วจะเป็นพ่อ/แม่ที่ดีที่สุด?",
    type: "VOTE",
    level: 1,
    is18Plus: false,
  },
  {
    text: "โหวต: ใครเหมาะจะเป็นนายก?",
    type: "VOTE",
    level: 1,
    is18Plus: false,
  },
  // ===============================
  // Level 2 - เริ่มเดือด
  // ===============================
  {
    text: "เคยแอบชอบเพื่อนสนิทคนไหนในกลุ่มบ้าง?",
    type: "TRUTH",
    level: 2,
    is18Plus: false,
  },
  {
    text: "ช่วงไหนที่รู้สึกเหงาที่สุดในชีวิต?",
    type: "QUESTION",
    level: 2,
    is18Plus: false,
  },
  {
    text: "เคยโกหกแฟนเรื่องอะไรหนักสุด?",
    type: "TRUTH",
    level: 2,
    is18Plus: false,
  },
  {
    text: "ถ้าให้เลือกเพื่อนในวงเป็นแฟน จะเลือกใคร?",
    type: "TRUTH",
    level: 2,
    is18Plus: false,
  },
  {
    text: "โทรหาแฟนเก่าแล้วบอกว่าคิดถึงหมาของเขา",
    type: "DARE",
    level: 2,
    is18Plus: false,
  },
  {
    text: "ปลดล็อคมือถือแล้วให้เพื่อนเลือนดู 1 นาที",
    type: "DARE",
    level: 2,
    is18Plus: false,
  },
  {
    text: "โหวต: ใครในวงดื่มเก่งที่สุด?",
    type: "VOTE",
    level: 2,
    is18Plus: false,
  },
  {
    text: "ทุกคนเล่าเรื่องน่าอาย 1 เรื่อง ใครไม่บอกดื่ม 2 แก้ว",
    type: "CHAOS",
    level: 2,
    is18Plus: false,
  },
  // ===============================
  // Level 3 - เดือดสุด (18+)
  // ===============================
  {
    text: "เคยฝันเปียกถึงใครในวงบ้าง?",
    type: "TRUTH",
    level: 3,
    is18Plus: true,
  },
  {
    text: "ท่าเซ็กส์ที่ชอบที่สุดคือท่าอะไร?",
    type: "QUESTION",
    level: 3,
    is18Plus: true,
  },
  {
    text: "ครั้งล่าสุดที่ช่วยตัวเองคือเมื่อไหร่?",
    type: "TRUTH",
    level: 3,
    is18Plus: true,
  },
  {
    text: "ถ้าต้อง one night stand กับคนในวง จะเลือกใคร?",
    type: "TRUTH",
    level: 3,
    is18Plus: true,
  },
  {
    text: "ถอดเสื้อแล้วเดินไปหาเครื่องดื่มในตู้เย็น",
    type: "DARE",
    level: 3,
    is18Plus: true,
  },
  {
    text: "โหวต: ใครในวงเซ็กซี่ที่สุด?",
    type: "VOTE",
    level: 3,
    is18Plus: true,
  },
  {
    text: "ทุกคนบอก body count ถ้าโกหกต้องดื่ม 3 แก้ว",
    type: "CHAOS",
    level: 3,
    is18Plus: true,
  },
  // More questions...
  {
    text: "นิสัยแย่ๆ ที่ไม่อยากให้ใครรู้คืออะไร?",
    type: "QUESTION",
    level: 1,
    is18Plus: false,
  },
  {
    text: "เบอร์โทรศัพท์คนสุดท้ายที่โทรหาคือใคร?",
    type: "QUESTION",
    level: 1,
    is18Plus: false,
  },
  {
    text: "สิ่งที่ทำให้ร้องไห้ล่าสุดคืออะไร?",
    type: "QUESTION",
    level: 1,
    is18Plus: false,
  },
  {
    text: "ความสามารถพิเศษที่ไม่ค่อยมีคนรู้คืออะไร?",
    type: "QUESTION",
    level: 1,
    is18Plus: false,
  },
  {
    text: "สิ่งที่กลัวที่สุดในชีวิตคืออะไร?",
    type: "TRUTH",
    level: 1,
    is18Plus: false,
  },
  {
    text: "เลียนเสียงสัตว์ที่เพื่อนเลือกให้",
    type: "DARE",
    level: 1,
    is18Plus: false,
  },
  {
    text: "โหวต: ใครในวงที่น่าจะหาแฟนยากที่สุด?",
    type: "VOTE",
    level: 1,
    is18Plus: false,
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

  const adminUsername = (process.env.ADMIN_SEED_USERNAME || process.env.ADMIN_SEED_EMAIL || "").trim();
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  const adminName = process.env.ADMIN_SEED_NAME || "Admin";

  if (adminUsername && adminPassword) {
    const existing = await prisma.admin.findUnique({
      where: { email: adminUsername },
    });

    if (!existing) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await prisma.admin.create({
        data: {
          email: adminUsername,
          password: passwordHash,
          name: adminName,
          role: "SUPER_ADMIN",
          isActive: true,
        },
      });
      console.log("👮 Created admin user");
    } else {
      console.log("👮 Admin user already exists");
    }
  } else {
    console.log("👮 Skipped admin seed (missing ADMIN_SEED_USERNAME/EMAIL or PASSWORD)");
  }

  console.log("🎉 Seed completed!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

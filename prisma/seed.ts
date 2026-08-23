import { PrismaClient, type QuestionType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { QUESTIONS, RETIRED_QUESTION_TEXTS } from "./questionData";
import { validateAdminSeedEnvironment } from "./seedValidation";

validateAdminSeedEnvironment(process.env);

const dbUrl =
  process.env.DATABASE_PUBLIC_URL?.trim() || process.env.DATABASE_URL?.trim();

if (!dbUrl) {
  throw new Error("DATABASE_PUBLIC_URL or DATABASE_URL is required");
}

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

const questions = QUESTIONS;

async function main() {
  console.log("🌱 Starting seed...");

  const shouldResetQuestions = process.env.SEED_RESET_QUESTIONS === "true";
  const canResetInProduction =
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_PRODUCTION_SEED_RESET === "true";

  if (shouldResetQuestions) {
    if (!canResetInProduction) {
      throw new Error(
        "Refusing to reset questions in production without ALLOW_PRODUCTION_SEED_RESET=true",
      );
    }

    await prisma.question.deleteMany();
    console.log("🗑️  Cleared existing questions by explicit reset request");
  }

  for (const retiredText of RETIRED_QUESTION_TEXTS) {
    const result = await prisma.question.updateMany({
      where: { text: retiredText, isActive: true },
      data: { isActive: false },
    });

    if (result.count > 0) {
      console.log(
        `🚫 Deactivated ${result.count} retired question(s): "${retiredText.slice(0, 24)}..."`,
      );
    }
  }

  let createdCount = 0;
  let updatedCount = 0;

  for (const question of questions) {
    const existing = await prisma.question.findFirst({
      where: {
        text: question.text,
        type: question.type as QuestionType,
        level: question.level,
        is18Plus: question.is18Plus,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.question.update({
        where: { id: existing.id },
        data: {
          type: question.type as QuestionType,
          level: question.level,
          is18Plus: question.is18Plus,
          isPublic: true,
          isActive: true,
        },
      });
      updatedCount += 1;
      continue;
    }

    await prisma.question.create({
      data: {
        ...question,
        type: question.type as QuestionType,
        isPublic: true,
        isActive: true,
      },
    });
    createdCount += 1;
  }

  console.log(`✅ Seeded questions: ${createdCount} created, ${updatedCount} updated`);

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

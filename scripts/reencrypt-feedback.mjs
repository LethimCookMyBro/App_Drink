import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;
const ENCRYPTED_PREFIX = "enc:v1";
const ALGORITHM = "aes-256-gcm";

function readEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, "utf8");
    return Object.fromEntries(
      content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const index = line.indexOf("=");
          const key = line.slice(0, index).trim();
          const rawValue = line.slice(index + 1).trim();
          const value = rawValue.replace(/^"(.*)"$/, "$1").replace(/\\n/g, "\n");
          return [key, value];
        }),
    );
  } catch {
    return {};
  }
}

function getConfig() {
  const cwd = process.cwd();
  const env = {
    ...readEnvFile(resolve(cwd, ".env")),
    ...readEnvFile(resolve(cwd, ".env.local")),
    ...process.env,
  };

  const hasRailwayRuntime = Boolean(
    env.RAILWAY_PROJECT_ID || env.RAILWAY_SERVICE_ID || env.RAILWAY_ENVIRONMENT_ID,
  );
  const publicUrl = env.DATABASE_PUBLIC_URL || "";
  const internalUrl = env.DATABASE_URL || "";
  const databaseUrl = hasRailwayRuntime
    ? internalUrl || publicUrl
    : publicUrl || internalUrl;
  const jwtSecret = env.JWT_SECRET || "";
  const apiEncryptionKey =
    env.API_ENCRYPTION_KEY && env.API_ENCRYPTION_KEY.length >= 32
      ? env.API_ENCRYPTION_KEY
      : jwtSecret;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL or DATABASE_PUBLIC_URL is required");
  }

  if (!apiEncryptionKey) {
    throw new Error("API_ENCRYPTION_KEY or JWT_SECRET is required");
  }

  return { databaseUrl, apiEncryptionKey };
}

function getKey(secret) {
  return createHash("sha256").update(secret).digest();
}

function isEncrypted(value) {
  return typeof value === "string" && value.startsWith(`${ENCRYPTED_PREFIX}:`);
}

function encrypt(value, key) {
  if (isEncrypted(value)) {
    return value;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENCRYPTED_PREFIX}:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

function decrypt(value, key) {
  if (!value || !isEncrypted(value)) {
    return value;
  }

  const [, version, ivB64, tagB64, encryptedB64] = value.split(":");
  if (version !== "v1") {
    return value;
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivB64, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

const { databaseUrl, apiEncryptionKey } = getConfig();
const key = getKey(apiEncryptionKey);
const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

try {
  const rows = await prisma.feedback.findMany({
    select: {
      id: true,
      title: true,
      details: true,
      contact: true,
    },
  });
  const accountRows = await prisma.account.findMany({
    select: {
      id: true,
      access_token: true,
      refresh_token: true,
      id_token: true,
      session_state: true,
    },
  });

  let updatedCount = 0;
  let updatedAccountCount = 0;

  for (const row of rows) {
    const needsUpdate =
      !isEncrypted(row.title) ||
      (row.details !== null && !isEncrypted(row.details)) ||
      (row.contact !== null && !isEncrypted(row.contact));

    if (!needsUpdate) {
      continue;
    }

    await prisma.feedback.update({
      where: { id: row.id },
      data: {
        title: encrypt(decrypt(row.title, key), key),
        details:
          row.details === null ? null : encrypt(decrypt(row.details, key), key),
        contact:
          row.contact === null ? null : encrypt(decrypt(row.contact, key), key),
      },
    });

    updatedCount += 1;
  }

  for (const row of accountRows) {
    const needsUpdate =
      (row.access_token !== null && !isEncrypted(row.access_token)) ||
      (row.refresh_token !== null && !isEncrypted(row.refresh_token)) ||
      (row.id_token !== null && !isEncrypted(row.id_token)) ||
      (row.session_state !== null && !isEncrypted(row.session_state));

    if (!needsUpdate) {
      continue;
    }

    await prisma.account.update({
      where: { id: row.id },
      data: {
        access_token:
          row.access_token === null
            ? null
            : encrypt(decrypt(row.access_token, key), key),
        refresh_token:
          row.refresh_token === null
            ? null
            : encrypt(decrypt(row.refresh_token, key), key),
        id_token:
          row.id_token === null
            ? null
            : encrypt(decrypt(row.id_token, key), key),
        session_state:
          row.session_state === null
            ? null
            : encrypt(decrypt(row.session_state, key), key),
      },
    });

    updatedAccountCount += 1;
  }

  console.log(
    JSON.stringify({
      success: true,
      feedbackRows: rows.length,
      feedbackUpdatedCount: updatedCount,
      accountRows: accountRows.length,
      accountUpdatedCount: updatedAccountCount,
    }),
  );
} finally {
  await prisma.$disconnect();
  await pool.end();
}

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.warn(
    "WARNING: DATABASE_URL is not set. Database operations will fail.",
  );
}

// Create a PostgreSQL Pool for the adapter
const pool =
  globalForPrisma.pool ??
  (process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL })
    : undefined);

// Create the Prisma adapter
const adapter = pool ? new PrismaPg(pool) : undefined;

// Create Prisma client with adapter for Prisma 7
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}

export default prisma;

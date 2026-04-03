import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import env from "@/lib/env";
import { resolveDatabaseUrl } from "@/lib/databaseUrl";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

const dbUrl = resolveDatabaseUrl();
const pool =
  globalForPrisma.pgPool ??
  new Pool({
    connectionString: dbUrl,
    max: env.isProduction ? env.databaseMaxConnections : Math.min(5, env.databaseMaxConnections),
  });
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: env.isDevelopment ? ["error", "warn"] : ["error"],
  });

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = pool;
}

export default prisma;

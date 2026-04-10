import logger from "@/backend/logger";
import env from "@/backend/env";

function hasRailwayRuntime(): boolean {
  return Boolean(
    process.env.RAILWAY_PROJECT_ID ||
      process.env.RAILWAY_SERVICE_ID ||
      process.env.RAILWAY_ENVIRONMENT_ID,
  );
}

function isPostgresUrl(value: string | undefined): value is string {
  if (!value) return false;

  return value.startsWith("postgresql://") || value.startsWith("postgres://");
}

function normalizeUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function resolveDatabaseUrl(): string {
  const publicUrl = normalizeUrl(env.databasePublicUrl);
  const internalUrl = normalizeUrl(env.databaseUrl);

  if (hasRailwayRuntime() && isPostgresUrl(internalUrl)) {
    return internalUrl;
  }

  if (isPostgresUrl(publicUrl)) {
    return publicUrl;
  }

  if (isPostgresUrl(internalUrl)) {
    return internalUrl;
  }

  if (hasRailwayRuntime() && internalUrl) {
    logger.warn("database.invalid_railway_internal_url");
  }

  if (publicUrl || internalUrl) {
    throw new Error(
      "Database URL is invalid. Set DATABASE_PUBLIC_URL or DATABASE_URL to a postgresql:// URL.",
    );
  }

  throw new Error(
    "Database URL is missing. Set DATABASE_PUBLIC_URL or DATABASE_URL.",
  );
}

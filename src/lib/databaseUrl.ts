function hasRailwayRuntime(): boolean {
  return Boolean(
    process.env.RAILWAY_PROJECT_ID ||
      process.env.RAILWAY_SERVICE_ID ||
      process.env.RAILWAY_ENVIRONMENT_ID,
  );
}

export function resolveDatabaseUrl(): string {
  const publicUrl = process.env.DATABASE_PUBLIC_URL?.trim();
  const internalUrl = process.env.DATABASE_URL?.trim();

  if (hasRailwayRuntime() && internalUrl) {
    return internalUrl;
  }

  if (publicUrl) {
    return publicUrl;
  }

  if (internalUrl) {
    return internalUrl;
  }

  throw new Error(
    "Database URL is missing. Set DATABASE_PUBLIC_URL or DATABASE_URL.",
  );
}

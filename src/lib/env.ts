import { z } from "zod";
import { getDevelopmentFallbackSecret } from "@/lib/securityPrimitives";

const MIN_SECRET_LENGTH = 32;

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().optional(),
  DATABASE_PUBLIC_URL: z.string().optional(),
  DATABASE_MAX_CONNECTIONS: z.coerce.number().int().min(1).max(100).default(10),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  ALLOWED_ORIGINS: z.string().default(""),
  JWT_SECRET: z.string().optional(),
  ADMIN_JWT_SECRET: z.string().optional(),
  ROOM_JWT_SECRET: z.string().optional(),
  ROOM_JWT_SECRET_PREVIOUS: z.string().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED: z.enum(["true", "false"]).optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_SHEETS_SPREADSHEET_ID: z.string().optional(),
  GOOGLE_SHEETS_CLIENT_EMAIL: z.string().optional(),
  GOOGLE_SHEETS_PRIVATE_KEY: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  RATE_LIMIT_MAX: z.coerce.number().int().min(20).max(1000).default(200),
  API_ENCRYPTION_KEY: z.string().optional(),
  ADMIN_SEED_USERNAME: z.string().optional(),
  ADMIN_SEED_EMAIL: z.string().optional(),
  ADMIN_SEED_PASSWORD: z.string().optional(),
  ADMIN_SEED_NAME: z.string().optional(),
});

const parsedEnv = rawEnvSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(`Invalid environment configuration: ${parsedEnv.error.message}`);
}

const rawEnv = parsedEnv.data;

function isProductionBuildPhase(): boolean {
  if (rawEnv.NODE_ENV !== "production") {
    return false;
  }

  return (
    process.env.npm_lifecycle_event === "build" ||
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.argv.some((argument) => argument.includes("next") && argument.includes("build"))
  );
}

const allowBuildTimeSecretFallback = isProductionBuildPhase();

function parseOptionalOrigin(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function splitOrigins(value: string): string[] {
  return value
    .split(",")
    .map((entry) => parseOptionalOrigin(entry.trim()))
    .filter((entry): entry is string => Boolean(entry));
}

function resolveSecret(value: string | undefined, namespace: string): string {
  if (value && value.length >= MIN_SECRET_LENGTH) {
    return value;
  }

  if (rawEnv.NODE_ENV === "production" && !allowBuildTimeSecretFallback) {
    throw new Error(
      `Environment secret ${namespace} must be set and at least ${MIN_SECRET_LENGTH} characters long.`,
    );
  }

  return getDevelopmentFallbackSecret(
    allowBuildTimeSecretFallback ? `${namespace}-build` : namespace,
  );
}

const resolvedSecrets = {
  jwt: resolveSecret(rawEnv.JWT_SECRET, "jwt-secret"),
  admin: resolveSecret(rawEnv.ADMIN_JWT_SECRET, "admin-jwt-secret"),
  room: resolveSecret(rawEnv.ROOM_JWT_SECRET, "room-jwt-secret"),
  nextAuth: resolveSecret(rawEnv.NEXTAUTH_SECRET ?? rawEnv.JWT_SECRET, "nextauth-secret"),
};

if (rawEnv.NODE_ENV === "production" && !allowBuildTimeSecretFallback) {
  const providedSecuritySecrets = [
    rawEnv.JWT_SECRET,
    rawEnv.ADMIN_JWT_SECRET,
    rawEnv.ROOM_JWT_SECRET,
    rawEnv.NEXTAUTH_SECRET,
  ].filter((value): value is string => Boolean(value));
  const uniqueSecrets = new Set(providedSecuritySecrets);
  if (uniqueSecrets.size !== providedSecuritySecrets.length) {
    throw new Error("JWT_SECRET, ADMIN_JWT_SECRET, ROOM_JWT_SECRET, and NEXTAUTH_SECRET must all be different in production when explicitly provided.");
  }
}

export const env = {
  nodeEnv: rawEnv.NODE_ENV,
  isProduction: rawEnv.NODE_ENV === "production",
  isDevelopment: rawEnv.NODE_ENV === "development",
  databaseUrl: rawEnv.DATABASE_URL,
  databasePublicUrl: rawEnv.DATABASE_PUBLIC_URL,
  databaseMaxConnections: rawEnv.DATABASE_MAX_CONNECTIONS,
  appUrl: parseOptionalOrigin(rawEnv.NEXT_PUBLIC_APP_URL),
  allowedOrigins: splitOrigins(rawEnv.ALLOWED_ORIGINS),
  jwtSecret: resolvedSecrets.jwt,
  adminJwtSecret: resolvedSecrets.admin,
  roomJwtSecret: resolvedSecrets.room,
  previousRoomJwtSecret: rawEnv.ROOM_JWT_SECRET_PREVIOUS || "",
  nextAuthSecret: resolvedSecrets.nextAuth,
  apiEncryptionKey:
    rawEnv.API_ENCRYPTION_KEY && rawEnv.API_ENCRYPTION_KEY.length >= MIN_SECRET_LENGTH
      ? rawEnv.API_ENCRYPTION_KEY
      : resolvedSecrets.jwt,
  rateLimitMax: rawEnv.RATE_LIMIT_MAX,
  googleLoginEnabled:
    rawEnv.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED === "false"
      ? false
      : rawEnv.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED === "true"
        ? true
        : Boolean(rawEnv.GOOGLE_CLIENT_ID && rawEnv.GOOGLE_CLIENT_SECRET),
  googleClientId: rawEnv.GOOGLE_CLIENT_ID || "",
  googleClientSecret: rawEnv.GOOGLE_CLIENT_SECRET || "",
  googleSheetsSpreadsheetId: rawEnv.GOOGLE_SHEETS_SPREADSHEET_ID || "",
  googleSheetsClientEmail: rawEnv.GOOGLE_SHEETS_CLIENT_EMAIL || "",
  googleSheetsPrivateKey: rawEnv.GOOGLE_SHEETS_PRIVATE_KEY
    ? rawEnv.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, "\n")
    : "",
  googleSheetsEnabled: Boolean(
    rawEnv.GOOGLE_SHEETS_SPREADSHEET_ID &&
      rawEnv.GOOGLE_SHEETS_CLIENT_EMAIL &&
      rawEnv.GOOGLE_SHEETS_PRIVATE_KEY,
  ),
  nextAuthUrl: rawEnv.NEXTAUTH_URL || "",
  turnstileSiteKey: rawEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "",
  turnstileSecretKey: rawEnv.TURNSTILE_SECRET_KEY || "",
  adminSeedUsername: rawEnv.ADMIN_SEED_USERNAME || rawEnv.ADMIN_SEED_EMAIL || "",
  adminSeedPassword: rawEnv.ADMIN_SEED_PASSWORD || "",
  adminSeedName: rawEnv.ADMIN_SEED_NAME || "Super Admin",
} as const;

export function assertDistinctProductionSecrets(): void {
  void env.nextAuthSecret;
}

export default env;

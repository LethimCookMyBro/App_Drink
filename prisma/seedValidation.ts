export const ADMIN_SEED_DEFAULT_CREDENTIALS_ERROR =
  "Refusing to seed with default credentials. Set real values in .env first.";

const DEFAULT_ADMIN_SEED_USERNAME = "admin";
const DEFAULT_ADMIN_SEED_EMAIL = "admin@example.com";
const DEFAULT_ADMIN_SEED_PASSWORD = "change-me-please";
const MIN_ADMIN_SEED_PASSWORD_LENGTH = 12;

type SeedEnvironment = Record<string, string | undefined>;

export function validateAdminSeedEnvironment(env: SeedEnvironment): void {
  if (env.NODE_ENV === "test") {
    return;
  }

  const adminUsername = env.ADMIN_SEED_USERNAME?.trim();
  const adminEmail = env.ADMIN_SEED_EMAIL?.trim();
  const adminPassword = env.ADMIN_SEED_PASSWORD;

  if (
    adminUsername === DEFAULT_ADMIN_SEED_USERNAME ||
    adminEmail === DEFAULT_ADMIN_SEED_EMAIL ||
    adminPassword === DEFAULT_ADMIN_SEED_PASSWORD
  ) {
    throw new Error(ADMIN_SEED_DEFAULT_CREDENTIALS_ERROR);
  }

  if (adminPassword && adminPassword.length < MIN_ADMIN_SEED_PASSWORD_LENGTH) {
    throw new Error("ADMIN_SEED_PASSWORD must be at least 12 characters long.");
  }
}

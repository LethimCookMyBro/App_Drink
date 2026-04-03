import { createHash, randomBytes } from "crypto";

const globalForSecurityPrimitives = globalThis as typeof globalThis & {
  __wongTaekDevSecrets?: Map<string, string>;
};

function getDevSecretsStore(): Map<string, string> {
  if (!globalForSecurityPrimitives.__wongTaekDevSecrets) {
    globalForSecurityPrimitives.__wongTaekDevSecrets = new Map();
  }

  return globalForSecurityPrimitives.__wongTaekDevSecrets;
}

export function getDevelopmentFallbackSecret(namespace: string): string {
  const secrets = getDevSecretsStore();
  const cached = secrets.get(namespace);
  if (cached) {
    return cached;
  }

  const secret = randomBytes(32).toString("hex");
  secrets.set(namespace, secret);
  return secret;
}

export function hashStoredSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createTokenFingerprint(token: string): string {
  const signature = token.split(".")[2] || token;
  return createHash("sha256").update(signature).digest("hex").slice(0, 16);
}

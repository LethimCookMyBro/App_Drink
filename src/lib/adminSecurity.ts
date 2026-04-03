import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import logger from "@/lib/logger";

// ─── Security / UX Tunables ───────────────────────────────────────────────────

const LOCKOUT_TIERS = [
  { threshold: 10, durationMs: 24 * 60 * 60 * 1000 }, // 24h
  { threshold: 5, durationMs: 15 * 60 * 1000 },       // 15m
  { threshold: 3, durationMs: 60 * 1000 },            // 1m
] as const;

/**
 * Reset the consecutive-failure counter after a quiet period.
 * This preserves fair UX: old mistakes should not punish users forever.
 */
const FAILURE_COUNTER_RESET_MS = 30 * 60 * 1000; // 30m

const IDENTIFIER_MAX_LEN = 254;
const IP_MAX_LEN = 45; // max IPv6 string length
const METADATA_MAX_BYTES = 4000;
const METADATA_MAX_DEPTH = 3;
const METADATA_MAX_KEYS_PER_OBJECT = 25;
const METADATA_MAX_ARRAY_ITEMS = 20;
const METADATA_MAX_STRING_BYTES = 500;

const SERIALIZABLE_MAX_RETRIES = 4;
const SERIALIZABLE_BASE_BACKOFF_MS = 15;

// ─── Types ────────────────────────────────────────────────────────────────────

export type LockoutStatus =
  | { locked: false; retryAfterSeconds: 0 }
  | { locked: true; retryAfterSeconds: number };

type FailureRecordResult = {
  lockedUntil: Date | null;
  retryAfterSeconds: number;
  becameLocked: boolean;
  failedAttempts: number;
};

type ClearFailuresResult = {
  cleared: boolean;
  wasLocked: boolean;
};

export type AuditAction =
  | "ADMIN_LOGIN_SUCCESS"
  | "ADMIN_LOGIN_FAILURE"
  | "ADMIN_LOGOUT"
  | "ADMIN_QUESTION_CREATE"
  | "ADMIN_QUESTION_UPDATE"
  | "ADMIN_QUESTION_DELETE"
  | "ADMIN_ACCOUNT_LOCKED"
  | "ADMIN_ACCOUNT_UNLOCKED"
  | "ROOM_CREATED"
  | "ROOM_DELETED";

export interface AuditLogInput {
  adminId?: string | null;
  action: AuditAction;
  status: "SUCCESS" | "FAILURE";
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

function nowMs(): number {
  return Date.now();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitteredBackoffMs(attempt: number): number {
  const base = SERIALIZABLE_BASE_BACKOFF_MS * 2 ** attempt;
  const jitter = Math.floor(Math.random() * 10);
  return base + jitter;
}

function isRetryableSerializableError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

async function withSerializableRetry<T>(
  fn: () => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < SERIALIZABLE_MAX_RETRIES; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryableSerializableError(error) || attempt === SERIALIZABLE_MAX_RETRIES - 1) {
        throw error;
      }

      await sleep(jitteredBackoffMs(attempt));
    }
  }

  throw lastError;
}

function getLockoutDurationMs(failedAttempts: number): number {
  for (const tier of LOCKOUT_TIERS) {
    if (failedAttempts >= tier.threshold) return tier.durationMs;
  }
  return 0;
}

function isFutureDate(value: Date | null | undefined): value is Date {
  return Boolean(value && value.getTime() > nowMs());
}

function retryAfterSecondsFromDate(value: Date | null | undefined): number {
  if (!value) return 0;
  const remainingMs = value.getTime() - nowMs();
  return remainingMs > 0 ? Math.max(1, Math.ceil(remainingMs / 1000)) : 0;
}

function isFailureWindowExpired(lastAttemptAt: Date | null | undefined): boolean {
  if (!lastAttemptAt) return true;
  return nowMs() - lastAttemptAt.getTime() > FAILURE_COUNTER_RESET_MS;
}

function maxDate(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a.getTime() >= b.getTime() ? a : b;
}

function clampStringBytes(value: string, maxBytes: number): string {
  if (Buffer.byteLength(value, "utf8") <= maxBytes) return value;

  let out = value;

  while (out.length > 1 && Buffer.byteLength(out, "utf8") > maxBytes) {
    out = out.slice(0, Math.max(1, Math.floor(out.length * 0.85)));
  }

  while (out.length > 1 && Buffer.byteLength(out, "utf8") > maxBytes) {
    out = out.slice(0, -1);
  }

  return out;
}

// ─── Input normalization ──────────────────────────────────────────────────────

export function normalizeAdminIdentifier(value: string): string {
  return String(value)
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .slice(0, IDENTIFIER_MAX_LEN);
}

function normalizeIpAddress(value?: string | null): string | null {
  if (!value) return null;

  const firstHop = String(value)
    .split(",")[0]
    ?.trim();

  if (!firstHop) return null;

  return firstHop.slice(0, IP_MAX_LEN);
}

// ─── Metadata sanitization ────────────────────────────────────────────────────

function sanitizeMetadataValue(
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
): unknown {
  if (depth >= METADATA_MAX_DEPTH) {
    return "[max-depth]";
  }

  if (value === null) return null;

  switch (typeof value) {
    case "string":
      return clampStringBytes(value, METADATA_MAX_STRING_BYTES);

    case "number":
      return Number.isFinite(value) ? value : String(value);

    case "boolean":
      return value;

    case "bigint":
      return value.toString();

    case "undefined":
      return "[undefined]";

    case "symbol":
      return "[symbol]";

    case "function":
      return "[function]";

    case "object": {
      if (value instanceof Date) {
        return value.toISOString();
      }

      if (value instanceof Error) {
        return {
          name: clampStringBytes(value.name || "Error", 100),
          message: clampStringBytes(value.message || "unknown", 300),
        };
      }

      if (value instanceof RegExp) {
        return String(value);
      }

      if (Array.isArray(value)) {
        return value
          .slice(0, METADATA_MAX_ARRAY_ITEMS)
          .map((item) => sanitizeMetadataValue(item, depth + 1, seen));
      }

      const obj = value as Record<string, unknown>;

      if (seen.has(obj)) {
        return "[circular]";
      }

      seen.add(obj);

      const output: Record<string, unknown> = {};
      const entries = Object.entries(obj).slice(0, METADATA_MAX_KEYS_PER_OBJECT);

      for (const [rawKey, rawVal] of entries) {
        const safeKey = clampStringBytes(String(rawKey), 64);
        output[safeKey] = sanitizeMetadataValue(rawVal, depth + 1, seen);
      }

      seen.delete(obj);
      return output;
    }

    default:
      return "[unsupported]";
  }
}

function summarizeMetadata(
  value: Record<string, unknown>,
): Record<string, unknown> {
  const summary: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(value).slice(0, 10)) {
    const safeKey = clampStringBytes(String(k), 64);

    if (v === null) {
      summary[safeKey] = null;
    } else if (Array.isArray(v)) {
      summary[safeKey] = `[array:${v.length}]`;
    } else if (typeof v === "object") {
      summary[safeKey] = "[object]";
    } else if (typeof v === "string") {
      summary[safeKey] = clampStringBytes(v, 120);
    } else if (typeof v === "number" && !Number.isFinite(v)) {
      summary[safeKey] = String(v);
    } else {
      summary[safeKey] = v;
    }
  }

  return summary;
}

function serializeMetadata(metadata?: Record<string, unknown>): string | null {
  if (!metadata) return null;

  try {
    const seen = new WeakSet<object>();
    const sanitized = sanitizeMetadataValue(metadata, 0, seen);

    const normalized =
      sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)
        ? (sanitized as Record<string, unknown>)
        : { value: sanitized };

    const candidates: Record<string, unknown>[] = [
      normalized,
      { truncated: true, summary: summarizeMetadata(normalized) },
      { truncated: true, keys: Object.keys(normalized).slice(0, 10) },
      { truncated: true },
    ];

    for (const candidate of candidates) {
      const json = JSON.stringify(candidate);
      if (Buffer.byteLength(json, "utf8") <= METADATA_MAX_BYTES) {
        return json;
      }
    }

    return JSON.stringify({ truncated: true });
  } catch {
    return JSON.stringify({ invalid: true });
  }
}

// ─── Lockout reads ────────────────────────────────────────────────────────────

export async function getAdminLockout(
  identifier: string,
): Promise<LockoutStatus> {
  const normalized = normalizeAdminIdentifier(identifier);

  const record = await prisma.adminLockout.findUnique({
    where: { identifier: normalized },
    select: { lockedUntil: true },
  });

  if (!isFutureDate(record?.lockedUntil)) {
    if (record?.lockedUntil) {
      prisma.adminLockout
        .delete({ where: { identifier: normalized } })
        .catch(() => void 0);
    }

    return { locked: false, retryAfterSeconds: 0 };
  }

  return {
    locked: true,
    retryAfterSeconds: retryAfterSecondsFromDate(record.lockedUntil),
  };
}

// ─── Lockout writes (race-safe) ───────────────────────────────────────────────

export async function recordAdminLoginFailure(
  identifier: string,
  ip: string,
): Promise<FailureRecordResult> {
  const normalized = normalizeAdminIdentifier(identifier);
  const safeIp = normalizeIpAddress(ip);
  const now = new Date();

  return withSerializableRetry(async () => {
    return prisma.$transaction(
      async (tx) => {
        const existing = await tx.adminLockout.findUnique({
          where: { identifier: normalized },
          select: {
            failedAttempts: true,
            lastAttemptAt: true,
            lockedUntil: true,
          },
        });

        const previousWasLocked = isFutureDate(existing?.lockedUntil);

        const nextFailedAttempts =
          existing && !isFailureWindowExpired(existing.lastAttemptAt)
            ? existing.failedAttempts + 1
            : 1;

        const lockoutDurationMs = getLockoutDurationMs(nextFailedAttempts);
        const proposedLockedUntil =
          lockoutDurationMs > 0
            ? new Date(now.getTime() + lockoutDurationMs)
            : null;

        const nextLockedUntil = maxDate(
          previousWasLocked ? existing!.lockedUntil! : null,
          proposedLockedUntil,
        );

        await tx.adminLockout.upsert({
          where: { identifier: normalized },
          update: {
            failedAttempts: nextFailedAttempts,
            lastAttemptAt: now,
            lastIp: safeIp,
            lockedUntil: nextLockedUntil,
          },
          create: {
            identifier: normalized,
            failedAttempts: 1,
            lastAttemptAt: now,
            lastIp: safeIp,
            lockedUntil: proposedLockedUntil,
          },
        });

        return {
          lockedUntil: nextLockedUntil,
          retryAfterSeconds: retryAfterSecondsFromDate(nextLockedUntil),
          becameLocked: !previousWasLocked && Boolean(nextLockedUntil),
          failedAttempts: nextFailedAttempts,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  });
}

export async function clearAdminLoginFailures(
  identifier: string,
): Promise<ClearFailuresResult> {
  const normalized = normalizeAdminIdentifier(identifier);

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.adminLockout.findUnique({
        where: { identifier: normalized },
        select: { lockedUntil: true },
      });

      if (!existing) {
        return { cleared: false, wasLocked: false };
      }

      const wasLocked = isFutureDate(existing.lockedUntil);

      await tx.adminLockout.delete({
        where: { identifier: normalized },
      });

      return { cleared: true, wasLocked };
    });
  } catch {
    return { cleared: false, wasLocked: false };
  }
}

// ─── Audit log ────────────────────────────────────────────────────────────────

export async function writeAdminAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminId: input.adminId ?? null,
        action: input.action,
        status: input.status,
        ip: normalizeIpAddress(input.ip),
        metadata: serializeMetadata(input.metadata),
      },
    });
  } catch (err) {
    logger.error("admin.audit.write_failed", {
      action: input.action,
      status: input.status,
      error: err instanceof Error ? err.message : "unknown",
    });
  }
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────

export async function handleLoginSuccess(opts: {
  adminId: string;
  identifier: string;
  ip: string;
  userAgent?: string;
}): Promise<void> {
  const clearPromise = clearAdminLoginFailures(opts.identifier);

  const [clearResult] = await Promise.all([
    clearPromise,
    writeAdminAuditLog({
      adminId: opts.adminId,
      action: "ADMIN_LOGIN_SUCCESS",
      status: "SUCCESS",
      ip: opts.ip,
      userAgent: opts.userAgent,
    }),
  ]);

  if (clearResult.wasLocked) {
    await writeAdminAuditLog({
      adminId: opts.adminId,
      action: "ADMIN_ACCOUNT_UNLOCKED",
      status: "SUCCESS",
      ip: opts.ip,
      userAgent: opts.userAgent,
    });
  }
}

export async function handleLoginFailure(opts: {
  identifier: string;
  ip: string;
  userAgent?: string;
  reason?: string;
}): Promise<void> {
  let failureResult: FailureRecordResult | null = null;

  try {
    failureResult = await recordAdminLoginFailure(opts.identifier, opts.ip);
  } catch (err) {
    logger.error("admin.auth.record_failure_failed", {
      error: err instanceof Error ? err.message : "unknown",
    });
  }

  await writeAdminAuditLog({
    action: "ADMIN_LOGIN_FAILURE",
    status: "FAILURE",
    ip: opts.ip,
    userAgent: opts.userAgent,
    metadata: {
      reason: opts.reason ?? "invalid_credentials",
      retryAfterSeconds: failureResult?.retryAfterSeconds ?? 0,
      failedAttempts: failureResult?.failedAttempts ?? null,
    },
  });

  if (failureResult?.becameLocked) {
    await writeAdminAuditLog({
      action: "ADMIN_ACCOUNT_LOCKED",
      status: "SUCCESS",
      ip: opts.ip,
      userAgent: opts.userAgent,
      metadata: {
        retryAfterSeconds: failureResult.retryAfterSeconds,
        failedAttempts: failureResult.failedAttempts,
      },
    });
  }
}

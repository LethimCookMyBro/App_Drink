import type {
  Admin,
  AdminRole,
  FeedbackStatus,
  FeedbackType,
  QuestionType,
} from "@prisma/client";
import prisma from "@/backend/db";
import env from "@/backend/env";
import { isVerifiedUser, resolveAuthMethod } from "@/backend/adminUsers";
import { decodeStoredFeedback } from "@/backend/feedbackPrivacy";
import {
  maskContact,
  maskEmail,
  maskIdentifier,
  maskIpAddress,
  shortenText,
} from "@/backend/privacy";
import { listServerLogs } from "@/backend/serverLogs";
import { redactPotentialPII } from "@/backend/dataProtection";

export interface AdminIdentity {
  username: string;
  name: string;
  role: AdminRole;
  lastLoginAt: string | null;
}

export interface AdminOverviewData {
  admin: AdminIdentity;
  summary: {
    totalQuestions: number;
    activeRooms: number;
    totalUsers: number;
    verifiedUsers: number;
    pendingFeedback: number;
    activeLockouts: number;
  };
  questionMix: Array<{
    type: QuestionType;
    label: string;
    count: number;
  }>;
  levelMix: Array<{
    level: number;
    label: string;
    count: number;
  }>;
  topQuestions: Array<{
    id: string;
    text: string;
    type: QuestionType;
    usageCount: number;
    level: number;
    is18Plus: boolean;
  }>;
  recentUsers: AdminUserItem[];
  recentFeedback: AdminFeedbackItem[];
  recentAudit: AdminAuditItem[];
}

export interface AdminUserItem {
  id: string;
  name: string;
  maskedEmail: string;
  avatarUrl: string | null;
  authMethod: string;
  isVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  sessions: number;
  gamesPlayed: number;
}

export interface AdminUsersData {
  admin: AdminIdentity;
  summary: {
    totalUsers: number;
    verifiedUsers: number;
    googleLinkedUsers: number;
    recentLogins7d: number;
    activeSessions: number;
    totalGameSessions: number;
  };
  users: AdminUserItem[];
}

export interface AdminFeedbackItem {
  id: string;
  type: FeedbackType;
  title: string;
  details: string | null;
  contactMasked: string | null;
  hasContact: boolean;
  status: FeedbackStatus;
  createdAt: string;
  resolvedAt: string | null;
}

export interface AdminFeedbackData {
  admin: AdminIdentity;
  summary: Record<"ALL" | FeedbackStatus, number>;
  feedbacks: AdminFeedbackItem[];
}

export interface AdminAuditItem {
  id: string;
  action: string;
  status: string;
  ipMasked: string | null;
  userAgent: string;
  adminName: string;
  createdAt: string;
}

export interface AdminSecurityData {
  admin: AdminIdentity;
  posture: Array<{
    label: string;
    value: string;
    tone: "default" | "good" | "warn";
  }>;
  metrics: {
    failedLogins24h: number;
    successfulLogins24h: number;
    activeLockouts: number;
    auditEvents24h: number;
    questionWrites24h: number;
  };
  activeLockouts: Array<{
    identifierMasked: string | null;
    failedAttempts: number;
    lockedUntil: string | null;
    lastAttemptAt: string;
    lastIpMasked: string | null;
  }>;
  recentAudit: AdminAuditItem[];
  recentServerLogs: AdminServerLogItem[];
}

export interface AdminServerLogItem {
  id: string;
  level: string;
  message: string;
  contextPreview: string | null;
  createdAt: string;
}

const QUESTION_LABELS: Record<QuestionType, string> = {
  QUESTION: "คำถาม",
  TRUTH: "ความจริง",
  DARE: "ท้า",
  CHAOS: "โกลาหล",
  VOTE: "โหวต",
};

const LEVEL_LABELS: Record<number, string> = {
  1: "ชิลล์",
  2: "กลาง",
  3: "แรง",
};

function toIsoString(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function toAdminIdentity(admin: Pick<Admin, "email" | "name" | "role" | "lastLoginAt">): AdminIdentity {
  return {
    username: maskEmail(admin.email),
    name: admin.name,
    role: admin.role,
    lastLoginAt: toIsoString(admin.lastLoginAt),
  };
}

function toUserItem(user: {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  image: string | null;
  password: string | null;
  isVerified: boolean;
  emailVerified: Date | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  accounts: Array<{ provider: string }>;
  _count: {
    sessions: number;
    authSessions: number;
    gameSessions: number;
  };
}): AdminUserItem {
  return {
    id: user.id,
    name: user.name,
    maskedEmail: maskEmail(user.email),
    avatarUrl: user.avatarUrl ?? user.image ?? null,
    authMethod: resolveAuthMethod(user),
    isVerified: isVerifiedUser(user),
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: toIsoString(user.lastLoginAt),
    sessions: user._count.sessions + user._count.authSessions,
    gamesPlayed: user._count.gameSessions,
  };
}

function toFeedbackItem(feedback: {
  id: string;
  type: FeedbackType;
  title: string;
  details: string | null;
  contact: string | null;
  status: FeedbackStatus;
  createdAt: Date;
  resolvedAt: Date | null;
}): AdminFeedbackItem {
  const decoded = decodeStoredFeedback(feedback);
  return {
    id: decoded.id,
    type: decoded.type,
    title: redactPotentialPII(decoded.title) || decoded.title,
    details: redactPotentialPII(decoded.details),
    contactMasked: maskContact(decoded.contact),
    hasContact: Boolean(decoded.contact),
    status: decoded.status,
    createdAt: decoded.createdAt.toISOString(),
    resolvedAt: toIsoString(decoded.resolvedAt),
  };
}

function toAuditItem(log: {
  id: string;
  action: string;
  status: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
  admin: { name: string; email: string } | null;
}): AdminAuditItem {
  return {
    id: log.id,
    action: log.action,
    status: log.status,
    ipMasked: maskIpAddress(log.ip),
    userAgent: shortenText(log.userAgent, 48),
    adminName: log.admin?.name || maskEmail(log.admin?.email || "") || "System",
    createdAt: log.createdAt.toISOString(),
  };
}

function toServerLogItem(log: {
  id: string;
  level: string;
  message: string;
  context: string | null;
  createdAt: Date;
}): AdminServerLogItem {
  return {
    id: log.id,
    level: log.level.toUpperCase(),
    message: shortenText(redactPotentialPII(log.message) || log.message, 140),
    contextPreview: log.context
      ? shortenText(redactPotentialPII(log.context) || log.context, 140)
      : null,
    createdAt: log.createdAt.toISOString(),
  };
}

function buildFeedbackSummary(
  rows: Array<{ status: FeedbackStatus; _count: { _all: number } }>,
): Record<"ALL" | FeedbackStatus, number> {
  const summary = createEmptyFeedbackSummary();

  for (const row of rows) {
    summary[row.status] = row._count._all;
    summary.ALL += row._count._all;
  }

  return summary;
}

function createEmptyFeedbackSummary(): Record<"ALL" | FeedbackStatus, number> {
  return {
    ALL: 0,
    PENDING: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
    REJECTED: 0,
  };
}

export function buildFeedbackSummaryFromItems(
  items: Array<{ status: FeedbackStatus }>,
): Record<"ALL" | FeedbackStatus, number> {
  const summary = createEmptyFeedbackSummary();

  for (const item of items) {
    summary[item.status] += 1;
    summary.ALL += 1;
  }

  return summary;
}

export async function getAdminOverviewData(admin: Pick<Admin, "email" | "name" | "role" | "lastLoginAt">): Promise<AdminOverviewData> {
  const [questionCount, activeRooms, totalUsers, verifiedUsers, feedbackPending, activeLockouts, questionMixRows, levelMixRows, topQuestions, recentUsers, recentFeedback, recentAudit] =
    await Promise.all([
      prisma.question.count({ where: { isActive: true } }),
      prisma.room.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.user.count({ where: { OR: [{ isVerified: true }, { emailVerified: { not: null } }] } }),
      prisma.feedback.count({ where: { status: "PENDING" } }),
      prisma.adminLockout.count({ where: { lockedUntil: { gt: new Date() } } }),
      prisma.question.groupBy({
        by: ["type"],
        where: { isActive: true },
        _count: { _all: true },
      }),
      prisma.question.groupBy({
        by: ["level"],
        where: { isActive: true },
        _count: { _all: true },
      }),
      prisma.question.findMany({
        where: { isActive: true },
        orderBy: [{ usageCount: "desc" }, { updatedAt: "desc" }],
        take: 5,
        select: {
          id: true,
          text: true,
          type: true,
          usageCount: true,
          level: true,
          is18Plus: true,
        },
      }),
      prisma.user.findMany({
        take: 5,
        orderBy: [{ lastLoginAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          image: true,
          password: true,
          isVerified: true,
          emailVerified: true,
          createdAt: true,
          lastLoginAt: true,
          accounts: { select: { provider: true } },
          _count: {
            select: {
              sessions: true,
              authSessions: true,
              gameSessions: true,
            },
          },
        },
      }),
      prisma.feedback.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          type: true,
          title: true,
          details: true,
          contact: true,
          status: true,
          createdAt: true,
          resolvedAt: true,
        },
      }),
      prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          action: true,
          status: true,
          ip: true,
          userAgent: true,
          createdAt: true,
          admin: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

  return {
    admin: toAdminIdentity(admin),
    summary: {
      totalQuestions: questionCount,
      activeRooms,
      totalUsers,
      verifiedUsers,
      pendingFeedback: feedbackPending,
      activeLockouts,
    },
    questionMix: questionMixRows.map((row) => ({
      type: row.type,
      label: QUESTION_LABELS[row.type],
      count: row._count._all,
    })),
    levelMix: levelMixRows
      .map((row) => ({
        level: row.level,
        label: LEVEL_LABELS[row.level] || `ระดับ ${row.level}`,
        count: row._count._all,
      }))
      .sort((a, b) => a.level - b.level),
    topQuestions: topQuestions.map((question) => ({
      id: question.id,
      text: question.text,
      type: question.type,
      usageCount: question.usageCount,
      level: question.level,
      is18Plus: question.is18Plus,
    })),
    recentUsers: recentUsers.map(toUserItem),
    recentFeedback: recentFeedback.map(toFeedbackItem),
    recentAudit: recentAudit.map(toAuditItem),
  };
}

export async function getAdminUsersData(admin: Pick<Admin, "email" | "name" | "role" | "lastLoginAt">): Promise<AdminUsersData> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalUsers, verifiedUsers, googleLinkedUsers, recentLogins7d, activeLegacySessions, activeOAuthSessions, totalGameSessions, users] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { OR: [{ isVerified: true }, { emailVerified: { not: null } }] } }),
      prisma.user.count({ where: { accounts: { some: { provider: "google" } } } }),
      prisma.user.count({ where: { lastLoginAt: { gte: sevenDaysAgo } } }),
      prisma.userSession.count({ where: { expiresAt: { gt: now } } }),
      prisma.session.count({ where: { expires: { gt: now } } }),
      prisma.gameSession.count(),
      prisma.user.findMany({
        take: 50,
        orderBy: [{ lastLoginAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          image: true,
          password: true,
          isVerified: true,
          emailVerified: true,
          createdAt: true,
          lastLoginAt: true,
          accounts: { select: { provider: true } },
          _count: {
            select: {
              sessions: true,
              authSessions: true,
              gameSessions: true,
            },
          },
        },
      }),
    ]);

  return {
    admin: toAdminIdentity(admin),
    summary: {
      totalUsers,
      verifiedUsers,
      googleLinkedUsers,
      recentLogins7d,
      activeSessions: activeLegacySessions + activeOAuthSessions,
      totalGameSessions,
    },
    users: users.map(toUserItem),
  };
}

export async function getAdminFeedbackData(admin: Pick<Admin, "email" | "name" | "role" | "lastLoginAt">): Promise<AdminFeedbackData> {
  const [feedbackRows, statusRows] = await Promise.all([
    prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        type: true,
        title: true,
        details: true,
        contact: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
      },
    }),
    prisma.feedback.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  return {
    admin: toAdminIdentity(admin),
    summary: buildFeedbackSummary(statusRows),
    feedbacks: feedbackRows.map(toFeedbackItem),
  };
}

export async function getAdminSecurityData(admin: Pick<Admin, "email" | "name" | "role" | "lastLoginAt">): Promise<AdminSecurityData> {
  const now = new Date();
  const since24HoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [recentAudit, recentServerLogs, failedLogins24h, successfulLogins24h, auditEvents24h, questionWrites24h, activeLockouts, lockoutRows] =
    await Promise.all([
      prisma.auditLog.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          action: true,
          status: true,
          ip: true,
          userAgent: true,
          createdAt: true,
          admin: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      listServerLogs(20),
      prisma.auditLog.count({
        where: {
          action: "ADMIN_LOGIN_FAILURE",
          createdAt: { gte: since24HoursAgo },
        },
      }),
      prisma.auditLog.count({
        where: {
          action: "ADMIN_LOGIN_SUCCESS",
          createdAt: { gte: since24HoursAgo },
        },
      }),
      prisma.auditLog.count({
        where: {
          createdAt: { gte: since24HoursAgo },
        },
      }),
      prisma.auditLog.count({
        where: {
          action: {
            in: [
              "ADMIN_QUESTION_CREATE",
              "ADMIN_QUESTION_UPDATE",
              "ADMIN_QUESTION_DELETE",
            ],
          },
          createdAt: { gte: since24HoursAgo },
        },
      }),
      prisma.adminLockout.count({
        where: {
          lockedUntil: { gt: now },
        },
      }),
      prisma.adminLockout.findMany({
        where: {
          OR: [
            { lockedUntil: { gt: now } },
            { failedAttempts: { gt: 0 } },
          ],
        },
        take: 12,
        orderBy: [{ lockedUntil: "desc" }, { lastAttemptAt: "desc" }],
        select: {
          identifier: true,
          failedAttempts: true,
          lockedUntil: true,
          lastIp: true,
          lastAttemptAt: true,
        },
      }),
    ]);

  return {
    admin: toAdminIdentity(admin),
    posture: [
      {
        label: "Turnstile",
        value:
          env.turnstileSiteKey && env.turnstileSecretKey
            ? "เปิดใช้"
            : "ยังไม่ตั้งค่า",
        tone: env.turnstileSiteKey && env.turnstileSecretKey ? "good" : "warn",
      },
      {
        label: "Google Login",
        value: env.googleLoginEnabled ? "พร้อมใช้งาน" : "ปิดอยู่",
        tone: env.googleLoginEnabled ? "good" : "default",
      },
      {
        label: "Google Sheets Export",
        value: env.googleSheetsEnabled ? "พร้อมใช้งาน" : "ยังไม่ตั้งค่า",
        tone: env.googleSheetsEnabled ? "good" : "warn",
      },
      {
        label: "Allowed Origins",
        value: env.allowedOrigins.length > 0 ? env.allowedOrigins.join(", ") : "ไม่ได้ตั้งค่า",
        tone: env.allowedOrigins.length > 0 ? "good" : "warn",
      },
      {
        label: "Cookie Policy",
        value: "HttpOnly + SameSite=Strict",
        tone: "good",
      },
      {
        label: "Secrets",
        value: "แยก secret ตาม role",
        tone: "good",
      },
    ],
    metrics: {
      failedLogins24h,
      successfulLogins24h,
      activeLockouts,
      auditEvents24h,
      questionWrites24h,
    },
    activeLockouts: lockoutRows.map((row) => ({
      identifierMasked: maskIdentifier(row.identifier),
      failedAttempts: row.failedAttempts,
      lockedUntil: toIsoString(row.lockedUntil),
      lastAttemptAt: row.lastAttemptAt.toISOString(),
      lastIpMasked: maskIpAddress(row.lastIp),
    })),
    recentAudit: recentAudit.map(toAuditItem),
    recentServerLogs: recentServerLogs.map(toServerLogItem),
  };
}

import type { Admin } from "@prisma/client";
import prisma from "@/lib/db";
import {
  buildFeedbackSummaryFromItems,
  getAdminOverviewData,
  getAdminSecurityData,
  getAdminUsersData,
} from "@/lib/adminData";
import {
  ADMIN_EXPORT_LABELS,
  type AdminExportDataset,
} from "@/lib/adminExportTypes";
import {
  type GoogleSheetCell,
  type GoogleSheetTab,
  type GoogleSheetsSyncResult,
  syncGoogleSheetTabs,
} from "@/lib/googleSheets";
import {
  redactPotentialPII,
} from "@/lib/dataProtection";
import {
  maskContact,
  maskEmail,
  maskIdentifier,
  maskIpAddress,
  shortenText,
} from "@/lib/privacy";
import { isVerifiedUser, resolveAuthMethod } from "@/lib/adminUsers";
import { decodeStoredFeedback } from "@/lib/feedbackPrivacy";
import { listServerLogs } from "@/lib/serverLogs";

function normalizeSheetCell(value: unknown): GoogleSheetCell {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value === null || value === undefined) {
    return "";
  }

  return JSON.stringify(value);
}

function buildTab(
  title: string,
  headers: string[],
  rows: Array<Array<unknown>>,
): GoogleSheetTab {
  return {
    title,
    values: [headers, ...rows].map((row) => row.map(normalizeSheetCell)),
  };
}

function buildMetaTab(
  dataset: AdminExportDataset,
  admin: Pick<Admin, "email" | "name" | "role">,
): GoogleSheetTab {
  return buildTab(
    "admin_export_meta",
    ["field", "value"],
    [
      ["dataset", dataset],
      ["dataset_label", ADMIN_EXPORT_LABELS[dataset]],
      ["generated_at", new Date().toISOString()],
      ["exported_by_email", maskEmail(admin.email)],
      ["exported_by_name", admin.name],
      ["exported_by_role", admin.role],
      ["privacy_mode", "masked-default"],
    ],
  );
}

function summarizeQuestions(
  questions: Array<{
    type: string;
    level: number;
    isActive: boolean;
    isPublic: boolean;
    is18Plus: boolean;
  }>,
) {
  const typeCounts = new Map<string, number>();
  const levelCounts = new Map<number, number>();
  let activeQuestions = 0;
  let publicQuestions = 0;
  let adultQuestions = 0;

  for (const question of questions) {
    if (question.isActive) activeQuestions += 1;
    if (question.isPublic) publicQuestions += 1;
    if (question.is18Plus) adultQuestions += 1;
    typeCounts.set(question.type, (typeCounts.get(question.type) ?? 0) + 1);
    levelCounts.set(question.level, (levelCounts.get(question.level) ?? 0) + 1);
  }

  return {
    totalQuestions: questions.length,
    activeQuestions,
    publicQuestions,
    adultQuestions,
    typeCounts: Array.from(typeCounts).sort((a, b) => a[0].localeCompare(b[0])),
    levelCounts: Array.from(levelCounts).sort((a, b) => a[0] - b[0]),
  };
}

async function buildOverviewTabs(
  admin: Pick<Admin, "email" | "name" | "role" | "lastLoginAt">,
): Promise<GoogleSheetTab[]> {
  const data = await getAdminOverviewData(admin);

  return [
    buildTab(
      "admin_overview_summary",
      ["metric", "value"],
      Object.entries(data.summary),
    ),
    buildTab(
      "admin_overview_question_mix",
      ["type", "label", "count"],
      data.questionMix.map((item) => [item.type, item.label, item.count]),
    ),
    buildTab(
      "admin_overview_level_mix",
      ["level", "label", "count"],
      data.levelMix.map((item) => [item.level, item.label, item.count]),
    ),
    buildTab(
      "admin_overview_top_questions",
      ["id", "text", "type", "usage_count", "level", "is_18_plus"],
      data.topQuestions.map((item) => [
        item.id,
        item.text,
        item.type,
        item.usageCount,
        item.level,
        item.is18Plus,
      ]),
    ),
    buildTab(
      "admin_overview_recent_users",
      [
        "id",
        "name",
        "masked_email",
        "auth_method",
        "is_verified",
        "created_at",
        "last_login_at",
        "sessions",
        "games_played",
      ],
      data.recentUsers.map((item) => [
        item.id,
        item.name,
        item.maskedEmail,
        item.authMethod,
        item.isVerified,
        item.createdAt,
        item.lastLoginAt,
        item.sessions,
        item.gamesPlayed,
      ]),
    ),
    buildTab(
      "admin_overview_recent_feedback",
      [
        "id",
        "type",
        "title",
        "details",
        "contact_masked",
        "status",
        "created_at",
        "resolved_at",
      ],
      data.recentFeedback.map((item) => [
        item.id,
        item.type,
        item.title,
        item.details,
        item.contactMasked,
        item.status,
        item.createdAt,
        item.resolvedAt,
      ]),
    ),
    buildTab(
      "admin_overview_recent_audit",
      ["id", "action", "status", "ip_masked", "user_agent", "admin_name", "created_at"],
      data.recentAudit.map((item) => [
        item.id,
        item.action,
        item.status,
        item.ipMasked,
        item.userAgent,
        item.adminName,
        item.createdAt,
      ]),
    ),
  ];
}

async function buildUsersTabs(
  admin: Pick<Admin, "email" | "name" | "role" | "lastLoginAt">,
): Promise<GoogleSheetTab[]> {
  const summaryData = await getAdminUsersData(admin);
  const users = await prisma.user.findMany({
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
  });

  return [
    buildTab(
      "admin_users_summary",
      ["metric", "value"],
      Object.entries(summaryData.summary),
    ),
    buildTab(
      "admin_users_all",
      [
        "id",
        "name",
        "masked_email",
        "auth_method",
        "is_verified",
        "created_at",
        "last_login_at",
        "sessions",
        "games_played",
        "avatar_present",
      ],
      users.map((user) => [
        user.id,
        user.name,
        maskEmail(user.email),
        resolveAuthMethod(user),
        isVerifiedUser(user),
        user.createdAt.toISOString(),
        user.lastLoginAt?.toISOString() ?? "",
        user._count.sessions + user._count.authSessions,
        user._count.gameSessions,
        Boolean(user.avatarUrl ?? user.image),
      ]),
    ),
  ];
}

async function buildQuestionsTabs(): Promise<GoogleSheetTab[]> {
  const questions = await prisma.question.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      text: true,
      type: true,
      level: true,
      is18Plus: true,
      isPublic: true,
      isActive: true,
      usageCount: true,
      createdAt: true,
      updatedAt: true,
      createdBy: true,
    },
  });

  const {
    totalQuestions,
    activeQuestions,
    publicQuestions,
    adultQuestions,
    typeCounts,
    levelCounts,
  } = summarizeQuestions(questions);

  return [
    buildTab(
      "admin_questions_summary",
      ["metric", "value"],
      [
        ["total_questions", totalQuestions],
        ["active_questions", activeQuestions],
        ["public_questions", publicQuestions],
        ["adult_questions", adultQuestions],
      ],
    ),
    buildTab(
      "admin_questions_by_type",
      ["type", "count"],
      typeCounts.map(([type, count]) => [type, count]),
    ),
    buildTab(
      "admin_questions_by_level",
      ["level", "count"],
      levelCounts.map(([level, count]) => [level, count]),
    ),
    buildTab(
      "admin_questions_all",
      [
        "id",
        "text",
        "type",
        "level",
        "is_18_plus",
        "is_public",
        "is_active",
        "usage_count",
        "created_at",
        "updated_at",
        "created_by_admin_id",
      ],
      questions.map((item) => [
        item.id,
        item.text,
        item.type,
        item.level,
        item.is18Plus,
        item.isPublic,
        item.isActive,
        item.usageCount,
        item.createdAt.toISOString(),
        item.updatedAt.toISOString(),
        item.createdBy ?? "",
      ]),
    ),
  ];
}

async function buildFeedbackTabs(): Promise<GoogleSheetTab[]> {
  const feedbackRows = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
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
  });

  return [
    buildTab(
      "admin_feedback_summary",
      ["metric", "value"],
      Object.entries(buildFeedbackSummaryFromItems(feedbackRows)),
    ),
    buildTab(
      "admin_feedback_all",
      [
        "id",
        "type",
        "title",
        "details",
        "contact_masked",
        "has_contact",
        "status",
        "created_at",
        "resolved_at",
      ],
      feedbackRows.map((item) => {
        const decoded = decodeStoredFeedback(item);
        return [
          decoded.id,
          decoded.type,
          redactPotentialPII(decoded.title) || decoded.title,
          redactPotentialPII(decoded.details),
          maskContact(decoded.contact),
          Boolean(decoded.contact),
          decoded.status,
          decoded.createdAt.toISOString(),
          decoded.resolvedAt?.toISOString() ?? "",
        ];
      }),
    ),
  ];
}

async function buildSecurityTabs(
  admin: Pick<Admin, "email" | "name" | "role" | "lastLoginAt">,
): Promise<GoogleSheetTab[]> {
  const data = await getAdminSecurityData(admin);
  const lockoutRows = await prisma.adminLockout.findMany({
    orderBy: [{ lockedUntil: "desc" }, { lastAttemptAt: "desc" }],
    select: {
      identifier: true,
      failedAttempts: true,
      lockedUntil: true,
      lastAttemptAt: true,
      lastIp: true,
    },
  });

  return [
    buildTab(
      "admin_security_posture",
      ["label", "value", "tone"],
      data.posture.map((item) => [item.label, item.value, item.tone]),
    ),
    buildTab(
      "admin_security_metrics",
      ["metric", "value"],
      Object.entries(data.metrics),
    ),
    buildTab(
      "admin_security_lockouts",
      [
        "identifier_masked",
        "failed_attempts",
        "locked_until",
        "last_attempt_at",
        "last_ip_masked",
      ],
      lockoutRows.map((item) => [
        maskIdentifier(item.identifier),
        item.failedAttempts,
        item.lockedUntil?.toISOString() ?? "",
        item.lastAttemptAt.toISOString(),
        maskIpAddress(item.lastIp),
      ]),
    ),
  ];
}

async function buildAuditLogTabs(): Promise<GoogleSheetTab[]> {
  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      action: true,
      status: true,
      ip: true,
      userAgent: true,
      metadata: true,
      createdAt: true,
      admin: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return [
    buildTab(
      "admin_audit_logs",
      [
        "id",
        "action",
        "status",
        "ip_masked",
        "user_agent",
        "admin_name",
        "metadata",
        "created_at",
      ],
      rows.map((item) => [
        item.id,
        item.action,
        item.status,
        maskIpAddress(item.ip),
        shortenText(item.userAgent, 180),
        item.admin?.name || maskEmail(item.admin?.email || "") || "System",
        redactPotentialPII(item.metadata) ?? "",
        item.createdAt.toISOString(),
      ]),
    ),
  ];
}

async function buildServerLogTabs(): Promise<GoogleSheetTab[]> {
  const rows = await listServerLogs();

  return [
    buildTab(
      "admin_server_logs",
      ["id", "level", "message", "context", "created_at"],
      rows.map((item) => [
        item.id,
        item.level.toUpperCase(),
        redactPotentialPII(item.message) || item.message,
        redactPotentialPII(item.context) ?? "",
        item.createdAt.toISOString(),
      ]),
    ),
  ];
}

async function buildDatasetTabs(
  dataset: AdminExportDataset,
  admin: Pick<Admin, "email" | "name" | "role" | "lastLoginAt">,
): Promise<GoogleSheetTab[]> {
  switch (dataset) {
    case "overview":
      return buildOverviewTabs(admin);
    case "users":
      return buildUsersTabs(admin);
    case "questions":
      return buildQuestionsTabs();
    case "feedback":
      return buildFeedbackTabs();
    case "security":
      return buildSecurityTabs(admin);
    case "audit_logs":
      return buildAuditLogTabs();
    case "server_logs":
      return buildServerLogTabs();
    case "all":
      return [
        ...(await buildOverviewTabs(admin)),
        ...(await buildUsersTabs(admin)),
        ...(await buildQuestionsTabs()),
        ...(await buildFeedbackTabs()),
        ...(await buildSecurityTabs(admin)),
        ...(await buildAuditLogTabs()),
        ...(await buildServerLogTabs()),
      ];
    default:
      return [];
  }
}

export async function exportAdminDatasetToGoogleSheets(
  dataset: AdminExportDataset,
  admin: Pick<Admin, "email" | "name" | "role" | "lastLoginAt">,
): Promise<GoogleSheetsSyncResult> {
  const tabs = [
    buildMetaTab(dataset, admin),
    ...(await buildDatasetTabs(dataset, admin)),
  ];

  return syncGoogleSheetTabs(tabs);
}

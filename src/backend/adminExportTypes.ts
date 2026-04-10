export const ADMIN_EXPORT_DATASETS = [
  "overview",
  "users",
  "questions",
  "feedback",
  "security",
  "audit_logs",
  "server_logs",
  "all",
] as const;

export type AdminExportDataset = (typeof ADMIN_EXPORT_DATASETS)[number];

export const ADMIN_EXPORT_LABELS: Record<AdminExportDataset, string> = {
  overview: "Overview",
  users: "Users",
  questions: "Questions",
  feedback: "Feedback",
  security: "Security",
  audit_logs: "Audit Log",
  server_logs: "Server Log",
  all: "All Admin Data",
};

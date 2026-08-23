"use client";

import { Fragment, useMemo, useState } from "react";
import { AdminGoogleSheetsExportButton } from "@/frontend/components/admin/AdminGoogleSheetsExportButton";
import { AdminShell } from "@/frontend/components/admin/AdminShell";
import { StatusBadge } from "@/frontend/components/admin/StatusBadge";
import { AdminTable } from "@/frontend/components/admin/AdminTable";
import { AdminSelect } from "@/frontend/components/admin/AdminSelect";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminTableSkeleton,
} from "@/frontend/components/admin/AdminStates";
import { formatAdminDateTime, formatAdminNumber } from "@/frontend/admin/format";
import { useAdminRouteData } from "@/frontend/hooks/useAdminRouteData";
import type { AdminSecurityData } from "@/backend/adminData";

import { Icon } from "@/frontend/components/ui/Icon";

type ServerLogItem = AdminSecurityData["recentServerLogs"][number];
type PostureGroup = AdminSecurityData["posture"][number];

const AUDIT_ACTION_LABELS: Record<string, string> = {
  ADMIN_LOGIN_SUCCESS: "เข้าสู่ระบบสำเร็จ",
  ADMIN_LOGIN_FAILURE: "เข้าสู่ระบบไม่สำเร็จ",
  ADMIN_LOGOUT: "ออกจากระบบ",
  ADMIN_QUESTION_CREATE: "เพิ่มคำถาม",
  ADMIN_QUESTION_UPDATE: "แก้ไขคำถาม",
  ADMIN_QUESTION_DELETE: "ลบ/ปิดใช้งานคำถาม",
};

function humanizeAuditAction(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

const POSTURE_GROUP_LABELS: Record<PostureGroup["group"], string> = {
  auth: "การยืนยันตัวตน",
  web: "ความปลอดภัยเว็บ",
  integrations: "การเชื่อมต่อภายนอก",
};

type SecurityTab = "overview" | "audit" | "lockouts" | "logs" | "config";

const TABS: Array<{ id: SecurityTab; label: string }> = [
  { id: "overview", label: "ภาพรวม" },
  { id: "audit", label: "ตรวจสอบกิจกรรม" },
  { id: "lockouts", label: "Lockout" },
  { id: "logs", label: "Logs เซิร์ฟเวอร์" },
  { id: "config", label: "การตั้งค่า" },
];

function MetricBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "red";
}) {
  const alert = tone === "red" && value > 0;
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        alert ? "border-neon-red/25 bg-neon-red/5" : "border-white/8 bg-white/[0.02]"
      }`}
    >
      <p className="text-xs font-medium text-white/45">{label}</p>
      <p
        className={`mt-1.5 text-2xl font-bold tabular-nums ${
          alert ? "text-neon-red" : "text-white"
        }`}
      >
        {formatAdminNumber(value)}
      </p>
    </div>
  );
}

function AuditStatusBadge({ status }: { status: string }) {
  if (status === "SUCCESS") {
    return <StatusBadge tone="green">{status}</StatusBadge>;
  }
  return <StatusBadge tone="red">{status}</StatusBadge>;
}

export default function AdminSecurityPage() {
  const { data, loading, error, refresh } = useAdminRouteData<AdminSecurityData>(
    "/api/admin/security",
    "ไม่สามารถโหลดข้อมูลความปลอดภัยได้",
  );

  const [activeTab, setActiveTab] = useState<SecurityTab>("overview");
  const [expandedAuditIds, setExpandedAuditIds] = useState<Set<string>>(() => new Set());
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(() => new Set());
  const [actionFilter, setActionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const auditActions = useMemo(() => {
    const actions = new Set<string>();
    for (const item of data?.recentAudit ?? []) {
      actions.add(item.action);
    }
    return Array.from(actions).sort();
  }, [data?.recentAudit]);

  const filteredAudit = useMemo(() => {
    let rows = data?.recentAudit ?? [];
    if (actionFilter) {
      rows = rows.filter((item) => item.action === actionFilter);
    }
    if (statusFilter) {
      rows = rows.filter((item) =>
        statusFilter === "SUCCESS"
          ? item.status === "SUCCESS"
          : item.status !== "SUCCESS",
      );
    }
    return rows;
  }, [actionFilter, data?.recentAudit, statusFilter]);

  const importantEvents = useMemo(() => {
    const rows = data?.recentAudit ?? [];
    const important = rows.filter(
      (item) =>
        item.status !== "SUCCESS" ||
        item.action === "ADMIN_LOGIN_SUCCESS" ||
        item.action.startsWith("ADMIN_QUESTION"),
    );
    return (important.length > 0 ? important : rows).slice(0, 6);
  }, [data?.recentAudit]);

  const toggleSetItem = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    id: string,
  ) => {
    setter((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <AdminShell
      admin={data?.admin ?? null}
      title="ความปลอดภัย"
      description="กิจกรรมผู้ดูแล, lockout, log และสถานะการตั้งค่า — ข้อมูลส่วนบุคคลถูกปิดบังโดยค่าเริ่มต้น"
      actions={
        <>
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Icon name="refresh" className="text-base" />
            รีเฟรช
          </button>
          <AdminGoogleSheetsExportButton dataset="security" label="ส่งออก" />
          <AdminGoogleSheetsExportButton
            dataset="audit_logs"
            label="ส่งออกกิจกรรม"
            icon="history"
          />
        </>
      }
    >
      {error ? <div className="mb-4"><AdminErrorState message={error} /></div> : null}

      <div
        role="tablist"
        aria-label="ส่วนของหน้าความปลอดภัย"
        className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-white/8 bg-white/[0.03] p-1"
      >
        {TABS.map((tab, tabIndex) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              tabIndex={selected ? 0 : -1}
              aria-selected={selected}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => {
                let nextIndex = tabIndex;
                if (event.key === "ArrowRight") {
                  nextIndex = (tabIndex + 1) % TABS.length;
                } else if (event.key === "ArrowLeft") {
                  nextIndex = (tabIndex - 1 + TABS.length) % TABS.length;
                } else if (event.key === "Home") {
                  nextIndex = 0;
                } else if (event.key === "End") {
                  nextIndex = TABS.length - 1;
                } else {
                  return;
                }
                event.preventDefault();
                setActiveTab(TABS[nextIndex].id);
                (event.currentTarget.parentElement?.children[nextIndex] as HTMLElement | undefined)?.focus();
              }}
              className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                selected
                  ? "bg-primary/20 text-white"
                  : "text-white/50 hover:bg-white/5 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ---------------- Overview ---------------- */}
      {activeTab === "overview" ? (
        <section className="space-y-5" role="tabpanel" aria-label="ภาพรวมความปลอดภัย">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricBlock
              label="เข้าสู่ระบบไม่สำเร็จ / 24 ชม."
              value={loading ? 0 : data?.metrics.failedLogins24h ?? 0}
              tone="red"
            />
            <MetricBlock
              label="Lockout ที่ยังมีผล"
              value={loading ? 0 : data?.metrics.activeLockouts ?? 0}
              tone="red"
            />
            <MetricBlock
              label="เข้าสู่ระบบสำเร็จ / 24 ชม."
              value={loading ? 0 : data?.metrics.successfulLogins24h ?? 0}
              tone="default"
            />
            <MetricBlock
              label="เหตุการณ์ทั้งหมด / 24 ชม."
              value={loading ? 0 : data?.metrics.auditEvents24h ?? 0}
              tone="default"
            />
          </div>

          <div className="rounded-xl border border-white/8 bg-white/[0.02]">
            <header className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
              <h2 className="text-sm font-bold text-white">เหตุการณ์สำคัญล่าสุด</h2>
              <button
                type="button"
                onClick={() => setActiveTab("audit")}
                className="text-xs font-semibold text-primary transition-colors hover:text-white"
              >
                ดูทั้งหมด
              </button>
            </header>
            {loading ? (
              <div className="p-4"><AdminTableSkeleton rows={4} /></div>
            ) : importantEvents.length === 0 ? (
              <AdminEmptyState title="ยังไม่มีเหตุการณ์ในช่วงนี้" />
            ) : (
              <ul className="divide-y divide-white/5">
                {importantEvents.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                    <span className="w-36 shrink-0 text-xs tabular-nums text-white/40">
                      {formatAdminDateTime(item.createdAt)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-white/80">
                      {humanizeAuditAction(item.action)}
                    </span>
                    <span className="truncate text-xs text-white/40">{item.adminName}</span>
                    <AuditStatusBadge status={item.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}

      {/* ---------------- Audit events ---------------- */}
      {activeTab === "audit" ? (
        <section className="space-y-3" role="tabpanel" aria-label="ตรวจสอบกิจกรรม">
          <div className="flex flex-wrap items-end gap-2">
            <AdminSelect
              id="audit-action-filter"
              ariaLabel="กรองตามเหตุการณ์"
              value={actionFilter}
              onChange={setActionFilter}
              options={[
                { value: "", label: "เหตุการณ์: ทั้งหมด" },
                ...auditActions.map((action) => ({
                  value: action,
                  label: humanizeAuditAction(action),
                })),
              ]}
            />
            <AdminSelect
              id="audit-status-filter"
              ariaLabel="กรองตามสถานะ"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "", label: "สถานะ: ทั้งหมด" },
                { value: "SUCCESS", label: "SUCCESS" },
                { value: "FAILED", label: "ไม่สำเร็จ" },
              ]}
            />
            <p className="ml-auto text-xs text-white/35">
              แสดง {formatAdminNumber(filteredAudit.length)} รายการล่าสุด
            </p>
          </div>

          {loading ? (
            <AdminTableSkeleton rows={8} />
          ) : filteredAudit.length === 0 ? (
            <div className="rounded-xl border border-white/8 bg-white/[0.02]">
              <AdminEmptyState
                icon="history"
                title="ไม่พบเหตุการณ์ที่ตรงกับตัวกรอง"
                description="ลองเปลี่ยนตัวกรองเหตุการณ์หรือสถานะ"
              />
            </div>
          ) : (
            <AdminTable
              caption="บันทึกกิจกรรมผู้ดูแล"
              minWidth={860}
              headers={[
                { label: "เวลา", className: "whitespace-nowrap" },
                { label: "สถานะ" },
                { label: "เหตุการณ์" },
                { label: "ผู้กระทำ" },
                { label: "IP" },
                { label: "", className: "w-10" },
              ]}
            >
              {filteredAudit.map((item) => {
                const expanded = expandedAuditIds.has(item.id);
                return (
                  <Fragment key={item.id}>
                    <tr className="transition-colors hover:bg-white/[0.03]">
                      <td className="whitespace-nowrap px-3 py-2.5 align-middle text-xs tabular-nums text-white/50">
                        {formatAdminDateTime(item.createdAt)}
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <AuditStatusBadge status={item.status} />
                      </td>
                      <td className="px-3 py-2.5 align-middle text-sm text-white/85">
                        {humanizeAuditAction(item.action)}
                      </td>
                      <td className="max-w-[160px] truncate px-3 py-2.5 align-middle text-sm text-white/65">
                        {item.adminName}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-middle font-mono text-xs text-white/50">
                        {item.ipMasked ?? "-"}
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <button
                          type="button"
                          aria-label={expanded ? "ย่อรายละเอียด" : "ดูรายละเอียด"}
                          aria-expanded={expanded}
                          onClick={() => toggleSetItem(setExpandedAuditIds, item.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-white/35 transition-colors hover:bg-white/5 hover:text-white"
                        >
                          <Icon name={expanded ? "expand_less" : "expand_more"} className="text-base" />
                        </button>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className="bg-black/20">
                        <td colSpan={6} className="px-4 py-3">
                          <dl className="grid gap-2 text-xs sm:grid-cols-[140px_1fr]">
                            <dt className="font-semibold text-white/40">เวลาเต็ม</dt>
                            <dd className="text-white/70">{formatAdminDateTime(item.createdAt)}</dd>
                            <dt className="font-semibold text-white/40">User agent</dt>
                            <dd className="break-all font-mono text-white/55">
                              {item.userAgent || "-"}
                            </dd>
                            <dt className="font-semibold text-white/40">IP (ปิดบัง)</dt>
                            <dd className="font-mono text-white/55">{item.ipMasked ?? "-"}</dd>
                          </dl>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </AdminTable>
          )}
        </section>
      ) : null}

      {/* ---------------- Lockouts ---------------- */}
      {activeTab === "lockouts" ? (
        <section role="tabpanel" aria-label="รายการ lockout">
          {loading ? (
            <AdminTableSkeleton rows={4} />
          ) : (data?.activeLockouts.length ?? 0) === 0 ? (
            <div className="rounded-xl border border-white/8 bg-white/[0.02]">
              <AdminEmptyState
                icon="lock_open"
                title="ไม่มี lockout ที่ยังมีผล"
                description="บัญชีผู้ดูแลทั้งหมดสามารถเข้าสู่ระบบได้ตามปกติ"
              />
            </div>
          ) : (
            <AdminTable
              caption="รายการบัญชีที่ถูกล็อก"
              minWidth={820}
              headers={[
                { label: "Identifier" },
                { label: "พยายามไม่สำเร็จ", className: "text-right" },
                { label: "IP ล่าสุด" },
                { label: "พยายามล่าสุด" },
                { label: "ล็อกถึง" },
                { label: "สถานะ" },
              ]}
            >
              {data?.activeLockouts.map((item, index) => (
                <tr key={`${item.identifierMasked}-${index}`} className="transition-colors hover:bg-white/[0.03]">
                  <td className="px-3 py-2.5 align-middle font-mono text-xs text-white/75">
                    {item.identifierMasked ?? "ไม่ระบุ"}
                  </td>
                  <td className="px-3 py-2.5 text-right align-middle text-sm font-bold tabular-nums text-neon-red">
                    {formatAdminNumber(item.failedAttempts)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 align-middle font-mono text-xs text-white/50">
                    {item.lastIpMasked ?? "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 align-middle text-xs text-white/60">
                    {formatAdminDateTime(item.lastAttemptAt)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 align-middle text-xs text-white/60">
                    {formatAdminDateTime(item.lockedUntil)}
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <StatusBadge tone={item.isActiveLockout ? "red" : "neutral"} dot>
                      {item.isActiveLockout ? "ล็อกอยู่" : "หมดอายุ"}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </AdminTable>
          )}
        </section>
      ) : null}

      {/* ---------------- Server logs ---------------- */}
      {activeTab === "logs" ? (
        <section className="space-y-3" role="tabpanel" aria-label="บันทึกเซิร์ฟเวอร์">
          {loading ? (
            <AdminTableSkeleton rows={8} />
          ) : (data?.recentServerLogs.length ?? 0) === 0 ? (
            <div className="rounded-xl border border-white/8 bg-white/[0.02]">
              <AdminEmptyState icon="dns" title="ยังไม่มี server log ในระบบ" />
            </div>
          ) : (
            <>
              <p className="text-xs text-white/35">
                แสดง {formatAdminNumber(data?.recentServerLogs.length ?? 0)} รายการล่าสุด
              </p>
              <AdminTable
                caption="บันทึกเซิร์ฟเวอร์ล่าสุด"
                minWidth={760}
                headers={[
                  { label: "เวลา", className: "whitespace-nowrap" },
                  { label: "Level" },
                  { label: "ข้อความ" },
                  { label: "", className: "w-10" },
                ]}
              >
                {data?.recentServerLogs.map((item: ServerLogItem) => {
                  const expanded = expandedLogIds.has(item.id);
                  const hasContext = Boolean(item.contextPreview);
                  return (
                    <Fragment key={item.id}>
                      <tr className="transition-colors hover:bg-white/[0.03]">
                        <td className="whitespace-nowrap px-3 py-2.5 align-middle text-xs tabular-nums text-white/45">
                          {formatAdminDateTime(item.createdAt)}
                        </td>
                        <td className="px-3 py-2.5 align-middle">
                          <StatusBadge
                            tone={
                              item.level === "ERROR"
                                ? "red"
                                : item.level === "WARN"
                                  ? "yellow"
                                  : "blue"
                            }
                          >
                            {item.level}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-2.5 align-middle font-mono text-xs leading-relaxed text-white/75">
                          {item.message}
                        </td>
                        <td className="px-3 py-2.5 align-middle">
                          {hasContext ? (
                            <button
                              type="button"
                              aria-label={expanded ? "ย่อ context" : "ดู context"}
                              aria-expanded={expanded}
                              onClick={() => toggleSetItem(setExpandedLogIds, item.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-white/35 transition-colors hover:bg-white/5 hover:text-white"
                            >
                              <Icon name={expanded ? "expand_less" : "expand_more"} className="text-base" />
                            </button>
                          ) : null}
                        </td>
                      </tr>
                      {expanded && hasContext ? (
                        <tr className="bg-black/20">
                          <td colSpan={4} className="px-4 py-3">
                            <p className="mb-1 text-xs font-semibold text-white/40">Context</p>
                            <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-white/60">
                              {item.contextPreview}
                            </pre>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </AdminTable>
            </>
          )}
        </section>
      ) : null}

      {/* ---------------- Configuration ---------------- */}
      {activeTab === "config" ? (
        <section className="space-y-4" role="tabpanel" aria-label="สถานะการตั้งค่า">
          {loading ? (
            <AdminTableSkeleton rows={6} />
          ) : (
            data?.posture.map((group) => (
              <div key={group.group} className="rounded-xl border border-white/8 bg-white/[0.02]">
                <header className="border-b border-white/5 px-4 py-3">
                  <h2 className="text-sm font-bold text-white">
                    {POSTURE_GROUP_LABELS[group.group]}
                  </h2>
                </header>
                <ul className="divide-y divide-white/5">
                  {group.items.map((item) => (
                    <li key={item.label} className="flex items-start justify-between gap-4 px-4 py-3">
                      <span className="text-sm font-medium text-white/80">{item.label}</span>
                      <span className="flex items-center gap-2 text-right text-sm font-semibold">
                        {!item.checked ? (
                          <>
                            <Icon name="info" className="text-sm text-white/30" />
                            <span className="text-white/40">{item.value}</span>
                            <span className="sr-only">(ยังไม่ได้ตรวจสอบ)</span>
                          </>
                        ) : item.tone === "good" ? (
                          <>
                            <Icon name="check_circle" className="text-sm text-neon-green" />
                            <span className="text-neon-green">{item.value}</span>
                          </>
                        ) : item.tone === "warn" ? (
                          <>
                            <Icon name="warning" className="text-sm text-neon-yellow" />
                            <span className="text-neon-yellow">{item.value}</span>
                          </>
                        ) : (
                          <>
                            <Icon name="check_circle" className="text-sm text-white/40" />
                            <span className="text-white/60">{item.value}</span>
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
          <p className="text-xs leading-relaxed text-white/30">
            รายการที่ขึ้นว่า “ยังไม่ได้ตรวจสอบ” หรือ “โหมดพัฒนา” หมายความว่าระบบยังไม่เคย
            ตรวจสอบสถานะนั้นจริง ๆ ในสภาพแวดล้อมปัจจุบัน — ไม่ถือว่าผ่าน
          </p>
        </section>
      ) : null}
    </AdminShell>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GlassPanel } from "@/components/ui";
import { useState, useEffect } from "react";
import { rateLimitConfigs } from "@/lib/rateLimit";

interface QuestionStats {
  total: number;
  byLevel: { level: number; count: number }[];
  byType: { type: string; count: number }[];
  byRating: { is18Plus: boolean; count: number }[];
}

interface AdminUser {
  username: string;
  name: string;
  role: string;
  lastLoginAt?: string | null;
}

interface FeedbackItem {
  id: string;
  type: string;
  title: string;
  details: string | null;
  contact: string | null;
  status: string;
  createdAt: string;
}

interface StatsMeta {
  source: "db" | "fallback" | "partial" | "empty";
  fetchedAt: string | null;
  total: number;
  shown: number;
}

const mockQuestions: { level: number; type: string }[] = [];
const KNOWN_TYPES = ["QUESTION", "TRUTH", "DARE", "CHAOS", "VOTE"] as const;

function buildStats(
  questions: { level: number; type: string; is18Plus?: boolean }[],
  totalOverride?: number,
): QuestionStats {
  const total = typeof totalOverride === "number" ? totalOverride : questions.length;

  const levelCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  const typeCounts: Record<string, number> = Object.fromEntries(
    KNOWN_TYPES.map((type) => [type, 0]),
  );
  let adultCount = 0;

  questions.forEach((q) => {
    if (levelCounts[q.level] !== undefined) {
      levelCounts[q.level]++;
    }
    typeCounts[q.type] = (typeCounts[q.type] || 0) + 1;
    if (q.is18Plus) adultCount++;
  });

  return {
    total,
    byLevel: [
      { level: 1, count: levelCounts[1] },
      { level: 2, count: levelCounts[2] },
      { level: 3, count: levelCounts[3] },
    ],
    byType: Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count,
    })),
    byRating: [
      { is18Plus: true, count: adultCount },
      { is18Plus: false, count: Math.max(0, questions.length - adultCount) },
    ],
  };
}

const quickActions = [
  {
    label: "จัดการคำถาม",
    href: "/admin/questions",
    icon: "edit_note",
    desc: "เพิ่ม แก้ไข ลบคำถาม",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    label: "กลับหน้าเกม",
    href: "/",
    icon: "sports_esports",
    desc: "ทดสอบเกมวงแตก",
    color: "text-neon-green",
    bg: "bg-neon-green/10",
  },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<QuestionStats | null>(null);
  const [statsMeta, setStatsMeta] = useState<StatsMeta>({
    source: "db",
    fetchedAt: null,
    total: 0,
    shown: 0,
  });
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authCheckedAt, setAuthCheckedAt] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [activeTab, setActiveTab] = useState<"logs" | "security" | "feedback">(
    "feedback",
  );

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      router.push("/admin/login");
    }
  };

  // Verify admin session
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/admin/verify");
        if (!res.ok) {
          router.push("/admin/login");
          return;
        }
        const data = await res.json();
        if (!data?.authenticated) {
          router.push("/admin/login");
          return;
        }
        setAdminUser(data.admin);
        setAuthCheckedAt(new Date().toLocaleString("th-TH"));
      } catch {
        router.push("/admin/login");
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  // Handle feedback status change
  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (res.ok) {
        setFeedbacks((prev) =>
          prev.map((fb) => (fb.id === id ? { ...fb, status: newStatus } : fb)),
        );
      }
    } catch (error) {
      console.error("Failed to update feedback status:", error);
    }
  };

  // Handle feedback delete
  const handleDeleteFeedback = async (id: string) => {
    if (!confirm("ต้องการลบ feedback นี้?")) return;
    try {
      const res = await fetch(`/api/feedback/${id}`, { method: "DELETE" });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (res.ok) {
        setFeedbacks((prev) => prev.filter((fb) => fb.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete feedback:", error);
    }
  };

  // Check authentication on mount
  useEffect(() => {
    if (!adminUser) return;

    async function fetchStats() {
      try {
        setLoading(true);
        const res = await fetch("/api/questions?limit=1000&offset=0");
        if (res.status === 401) {
          router.push("/admin/login");
          return;
        }

        let questions = mockQuestions;
        let total = questions.length;
        let shown = questions.length;
        let source: StatsMeta["source"] = "fallback";

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            questions = data;
            total = data.length;
            shown = data.length;
            source = data.length === 0 ? "empty" : "db";
          } else if (data.questions && Array.isArray(data.questions)) {
            questions = data.questions;
            shown = data.questions.length;
            total = typeof data.total === "number" ? data.total : shown;

            if (data.fallback) {
              source = "fallback";
            } else if (total === 0) {
              source = "empty";
            } else if (total > shown) {
              source = "partial";
            } else {
              source = "db";
            }
          }
        }

        const computed = buildStats(questions as { level: number; type: string; is18Plus?: boolean }[], total);
        setStats(computed);
        setStatsMeta({
          source,
          fetchedAt: new Date().toLocaleString("th-TH"),
          total,
          shown,
        });
      } catch (error) {
        console.error("Failed to fetch stats, using mock data:", error);
        const questions = mockQuestions;
        const computed = buildStats(questions);
        setStats(computed);
        setStatsMeta({
          source: "fallback",
          fetchedAt: new Date().toLocaleString("th-TH"),
          total: computed.total,
          shown: questions.length,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchStats();

    // Fetch feedback
    async function fetchFeedback() {
      try {
        const res = await fetch("/api/feedback");
        if (res.status === 401) {
          router.push("/admin/login");
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setFeedbacks(data.feedbacks || []);
        }
      } catch (e) {
        console.error("Failed to fetch feedback:", e);
      }
    }
    fetchFeedback();
  }, [adminUser, router]);

  const levelCounts = {
    level1: stats?.byLevel.find((l) => l.level === 1)?.count ?? 0,
    level2: stats?.byLevel.find((l) => l.level === 2)?.count ?? 0,
    level3: stats?.byLevel.find((l) => l.level === 3)?.count ?? 0,
  };
  const adultCount =
    stats?.byRating.find((r) => r.is18Plus)?.count ?? 0;

  const statCards = [
    {
      label: "คำถามทั้งหมด",
      value: stats?.total ?? 0,
      desc: "All active questions",
      icon: "quiz",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "ระดับชิลล์",
      value: levelCounts.level1,
      desc: "Level 1 (Chill)",
      icon: "ac_unit",
      color: "text-neon-blue",
      bg: "bg-neon-blue/10",
    },
    {
      label: "ระดับกลาง",
      value: levelCounts.level2,
      desc: "Level 2 (Mid)",
      icon: "local_fire_department",
      color: "text-neon-yellow",
      bg: "bg-neon-yellow/10",
    },
    {
      label: "ระดับ 18+",
      value: adultCount,
      desc: "18+ by user setting",
      icon: "whatshot",
      color: "text-neon-red",
      bg: "bg-neon-red/10",
    },
  ];

  const questionTypes = [
    {
      type: "Q",
      label: "คำถาม",
      key: "QUESTION",
      color: "bg-primary",
      text: "text-white",
    },
    {
      type: "T",
      label: "Truth",
      key: "TRUTH",
      color: "bg-neon-blue",
      text: "text-white",
    },
    {
      type: "D",
      label: "ท้า (Dare)",
      key: "DARE",
      color: "bg-neon-green",
      text: "text-black",
    },
    {
      type: "C",
      label: "โกลาหล (Chaos)",
      key: "CHAOS",
      color: "bg-neon-red",
      text: "text-white",
    },
    {
      type: "V",
      label: "โหวต (Vote)",
      key: "VOTE",
      color: "bg-neon-yellow",
      text: "text-black",
    },
  ];

  const pendingFeedbackCount = feedbacks.filter(
    (fb) => fb.status === "PENDING",
  ).length;

  const statsSourceLabel =
    statsMeta.source === "fallback"
      ? "Fallback (DB empty)"
      : statsMeta.source === "partial"
        ? `Partial (${statsMeta.shown}/${statsMeta.total})`
        : statsMeta.source === "empty"
          ? "Empty database"
          : "Database";

  const appOrigin = (() => {
    const url = process.env.NEXT_PUBLIC_APP_URL;
    if (!url) return "Not set";
    try {
      return new URL(url).origin;
    } catch {
      return "Not set";
    }
  })();

  const lastLoginLabel = (() => {
    if (!adminUser?.lastLoginAt) return "-";
    const date = new Date(adminUser.lastLoginAt);
    return Number.isNaN(date.getTime())
      ? "-"
      : date.toLocaleString("th-TH");
  })();

  const systemLogs = [
    {
      level: "INFO",
      text: `Dashboard refreshed: ${statsMeta.fetchedAt ?? "-"}`,
    },
    {
      level: statsMeta.source === "fallback" ? "WARN" : "INFO",
      text: `Questions source: ${statsSourceLabel}`,
    },
    {
      level: "INFO",
      text: `Questions total: ${stats?.total ?? 0} (L1 ${levelCounts.level1}, L2 ${levelCounts.level2}, L3 ${levelCounts.level3}, 18+ ${adultCount})`,
    },
    {
      level: "INFO",
      text: `Feedback pending: ${pendingFeedbackCount}`,
    },
    {
      level: "INFO",
      text: `Rate limit (auth/admin): ${rateLimitConfigs.auth.maxRequests}/min, ${rateLimitConfigs.admin.maxRequests}/min`,
    },
  ];

  const securityLogs = [
    {
      label: "Admin Session",
      value: adminUser ? `Active (${adminUser.role})` : "Not authenticated",
    },
    {
      label: "Admin User",
      value: adminUser?.username || "-",
    },
    {
      label: "Last Verify",
      value: authCheckedAt || "-",
    },
    {
      label: "Last Login",
      value: lastLoginLabel,
    },
    {
      label: "Token TTL",
      value: "24h",
    },
    {
      label: "Cookie Policy",
      value: `HttpOnly, SameSite=Strict, Secure=${
        process.env.NODE_ENV === "production" ? "On" : "Off"
      }`,
    },
    {
      label: "Origin Check",
      value: appOrigin,
    },
    {
      label: "Rate Limit",
      value: `auth ${rateLimitConfigs.auth.maxRequests}/min, admin ${rateLimitConfigs.admin.maxRequests}/min`,
    },
  ];


  // Show loading state while checking auth
  if (isCheckingAuth) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0d0a10]">
        <div className="animate-pulse text-white/40">กำลังตรวจสอบสิทธิ์...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-y-auto no-scrollbar pb-8 bg-[#0d0a10]">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/5 px-4 md:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-primary to-purple-900 flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-white text-2xl md:text-3xl">
                admin_panel_settings
              </span>
            </div>
            <div>
              <h1 className="text-white font-bold text-xl md:text-2xl">
                Admin Panel
              </h1>
              <p className="text-white/40 text-sm hidden md:block">
                {adminUser
                  ? `ยินดีต้อนรับ ${adminUser.name || adminUser.username}`
                  : "Wong Taek Dashboard"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
            >
              <span className="material-symbols-outlined">home</span>
              <span className="hidden md:inline">หน้าหลัก</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neon-red/20 hover:bg-neon-red/30 text-neon-red transition-all"
            >
              <span className="material-symbols-outlined">logout</span>
              <span className="hidden md:inline">ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        {/* Stats Grid */}
        <section>
          <h2 className="text-white/40 text-xs font-bold tracking-[0.1em] uppercase mb-4">
            ภาพรวมคำถาม
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {statCards.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassPanel className="p-4 md:p-6 text-center hover:scale-[1.02] transition-transform cursor-default">
                  <div
                    className={`inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl ${stat.bg} mb-3`}
                  >
                    <span
                      className={`material-symbols-outlined text-2xl md:text-3xl ${stat.color}`}
                    >
                      {stat.icon}
                    </span>
                  </div>
                  <p className="text-2xl md:text-4xl font-bold text-white">
                    {loading ? "..." : stat.value}
                  </p>
                  <p className="text-white/40 text-xs md:text-sm mt-1">
                    {stat.label}
                  </p>
                  {stat.desc && (
                    <p className="text-white/30 text-[10px] md:text-xs mt-0.5">
                      {stat.desc}
                    </p>
                  )}
                </GlassPanel>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Quick Actions & Question Types */}
        <div className="grid lg:grid-cols-2 gap-6 mt-8">
          {/* Quick Actions */}
          <section>
            <h2 className="text-white/40 text-xs font-bold tracking-[0.1em] uppercase mb-4">
              จัดการ
            </h2>
            <div className="space-y-3">
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                >
                  <Link href={action.href}>
                    <GlassPanel className="flex items-center gap-4 p-4 md:p-5 hover:bg-white/5 transition-all active:scale-[0.98] group">
                      <div
                        className={`w-14 h-14 md:w-16 md:h-16 rounded-xl ${action.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}
                      >
                        <span
                          className={`material-symbols-outlined text-3xl md:text-4xl ${action.color}`}
                        >
                          {action.icon}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-bold text-lg">
                          {action.label}
                        </h3>
                        <p className="text-white/40 text-sm">{action.desc}</p>
                      </div>
                      <span className="material-symbols-outlined text-white/20 group-hover:text-white/50 group-hover:translate-x-1 transition-all">
                        arrow_forward
                      </span>
                    </GlassPanel>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Question Types */}
          <section>
            <h2 className="text-white/40 text-xs font-bold tracking-[0.1em] uppercase mb-4">
              ประเภทคำถาม
            </h2>
            <GlassPanel className="p-4 md:p-6">
              <div className="space-y-4">
                {questionTypes.map((item, index) => {
                  const count =
                    stats?.byType.find((t) => t.type === item.key)?.count ?? 0;
                  return (
                    <motion.div
                      key={item.type}
                      className="flex items-center justify-between"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl ${item.color} ${item.text} text-sm md:text-base font-bold`}
                        >
                          {item.type}
                        </span>
                        <span className="text-white text-sm md:text-base">
                          {item.label}
                        </span>
                      </div>
                      <span
                        className={`font-bold text-lg ${
                          item.type === "Q"
                            ? "text-primary"
                            : item.type === "D"
                              ? "text-neon-green"
                              : item.type === "T"
                                ? "text-neon-blue"
                                : item.type === "C"
                                  ? "text-neon-red"
                                  : "text-neon-yellow"
                        }`}
                      >
                        {loading ? "..." : `${count} ข้อ`}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </GlassPanel>
          </section>
        </div>

        {/* Help Section */}
        <section className="mt-8">
          <GlassPanel className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white/40 text-2xl">
                  help
                </span>
              </div>
              <div>
                <h3 className="text-white font-bold mb-2">
                  วิธีใช้งาน Admin Panel
                </h3>
                <ul className="text-white/50 text-sm space-y-1">
                  <li>
                    • คลิก &quot;จัดการคำถาม&quot; เพื่อเพิ่ม แก้ไข หรือลบคำถาม
                  </li>
                  <li>• คำถามมี 3 ระดับ: ชิลล์ กลาง และ แรง</li>
                  <li>• คำถาม 18+ จะแสดงเฉพาะเมื่อผู้ใช้เปิดโหมดในตั้งค่า</li>
                </ul>
              </div>
            </div>
          </GlassPanel>
        </section>

        {/* Tabbed Section: System Logs, Security, Feedback */}
        <section className="mt-8">
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-4 relative">
            {[
              { id: "logs", label: "System Logs", icon: "description" },
              { id: "security", label: "Security", icon: "shield" },
              {
                id: "feedback",
                label: `Feedback (${pendingFeedbackCount})`,
                icon: "chat_bubble",
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() =>
                  setActiveTab(tab.id as "logs" | "security" | "feedback")
                }
                className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "text-white"
                    : "text-white/50 hover:text-white/70 hover:bg-white/5"
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="adminTabIndicator"
                    className="absolute inset-0 bg-primary rounded-xl"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="material-symbols-outlined text-lg relative z-10">
                  {tab.icon}
                </span>
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "logs" && (
              <GlassPanel className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-2xl text-primary">
                    terminal
                  </span>
                  <h3 className="text-white font-bold">System Logs</h3>
                </div>
                <div className="space-y-2 text-sm font-mono">
                  {systemLogs.map((log, index) => (
                    <p
                      key={`${log.level}-${index}`}
                      className={
                        log.level === "WARN"
                          ? "text-neon-yellow/80"
                          : log.level === "ERROR"
                            ? "text-neon-red/80"
                            : "text-white/50"
                      }
                    >
                      [{log.level}] {log.text}
                    </p>
                  ))}
                </div>
              </GlassPanel>
            )}

            {activeTab === "security" && (
              <GlassPanel className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-2xl text-neon-blue">
                    verified_user
                  </span>
                  <h3 className="text-white font-bold">Security Status</h3>
                </div>
                <div className="grid gap-3">
                  {securityLogs.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                    >
                      <span className="text-white/70">{item.label}</span>
                      <span className="text-neon-green">{item.value}</span>
                    </div>
                  ))}
                </div>
              </GlassPanel>
            )}

            {activeTab === "feedback" && (
              <>
                {feedbacks.length === 0 ? (
                  <GlassPanel className="p-6 text-center">
                    <span className="material-symbols-outlined text-4xl text-white/20 mb-2">
                      inbox
                    </span>
                    <p className="text-white/40">ยังไม่มี Feedback</p>
                  </GlassPanel>
                ) : (
                  <div className="space-y-3">
                    {feedbacks.slice(0, 10).map((fb) => (
                      <GlassPanel key={fb.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                              fb.type === "BUG"
                                ? "bg-neon-red/20"
                                : "bg-neon-yellow/20"
                            }`}
                          >
                            <span
                              className={`material-symbols-outlined text-xl ${
                                fb.type === "BUG"
                                  ? "text-neon-red"
                                  : "text-neon-yellow"
                              }`}
                            >
                              {fb.type === "BUG" ? "bug_report" : "lightbulb"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  fb.type === "BUG"
                                    ? "bg-neon-red/20 text-neon-red"
                                    : "bg-neon-yellow/20 text-neon-yellow"
                                }`}
                              >
                                {fb.type === "BUG" ? "🐛 บัค" : "💡 ฟีเจอร์"}
                              </span>
                              {/* Status Dropdown */}
                              <div className="relative">
                                <select
                                  value={fb.status}
                                  onChange={(e) =>
                                    handleStatusChange(fb.id, e.target.value)
                                  }
                                  className={`text-xs px-2 py-0.5 rounded-full appearance-none cursor-pointer pr-6 ${
                                    fb.status === "PENDING"
                                      ? "bg-white/10 text-white/70"
                                      : fb.status === "IN_PROGRESS"
                                        ? "bg-neon-blue/20 text-neon-blue"
                                        : fb.status === "RESOLVED"
                                          ? "bg-neon-green/20 text-neon-green"
                                          : "bg-neon-red/20 text-neon-red"
                                  }`}
                                >
                                  <option value="PENDING">รอดำเนินการ</option>
                                  <option value="IN_PROGRESS">
                                    กำลังดำเนินการ
                                  </option>
                                  <option value="RESOLVED">แก้ไขแล้ว</option>
                                  <option value="REJECTED">ปฏิเสธ</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-1 top-1/2 -translate-y-1/2 text-xs pointer-events-none opacity-50">
                                  expand_more
                                </span>
                              </div>
                              <span className="text-white/30 text-xs">
                                {new Date(fb.createdAt).toLocaleDateString(
                                  "th-TH",
                                )}
                              </span>
                            </div>
                            <h4 className="text-white font-medium truncate">
                              {fb.title}
                            </h4>
                            {fb.details && (
                              <p className="text-white/50 text-sm mt-1 line-clamp-2">
                                {fb.details}
                              </p>
                            )}
                            {fb.contact && (
                              <p className="text-primary text-xs mt-2">
                                📧 {fb.contact}
                              </p>
                            )}
                          </div>
                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteFeedback(fb.id)}
                            className="p-2 rounded-lg hover:bg-neon-red/20 text-white/30 hover:text-neon-red transition-colors"
                            title="ลบ"
                          >
                            <span className="material-symbols-outlined text-lg">
                              delete
                            </span>
                          </button>
                        </div>
                      </GlassPanel>
                    ))}
                  </div>
                )}
              </>
            )}
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="mt-8 text-center">
          <p className="text-white/20 text-xs">
            Wong Taek Admin v1.0.0 • เหมาะสำหรับ Desktop และ Tablet
          </p>
        </footer>
      </div>
    </main>
  );
}

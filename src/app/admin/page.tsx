"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GlassPanel } from "@/components/ui";
import { useState, useEffect } from "react";

interface QuestionStats {
  total: number;
  byLevel: { level: number; count: number }[];
  byType: { type: string; count: number }[];
}

interface AdminUser {
  username: string;
  role: string;
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
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/admin/verify");
        const data = await res.json();
        if (!data.authenticated) {
          router.push("/admin/login");
          return;
        }
        setAdminUser(data.admin);
      } catch {
        router.push("/admin/login");
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin/login");
    } catch {
      console.error("Logout failed");
    }
  };

  // Mock data fallback (same as questions page)
  const mockQuestions = [
    {
      id: "1",
      text: "เคยโกหกแม่เรื่องอะไรบ้าง?",
      type: "QUESTION",
      level: 1,
      is18Plus: false,
    },
    {
      id: "2",
      text: "อาหารที่ชอบกินคนเดียวไม่ชอบแบ่งใครคืออะไร?",
      type: "QUESTION",
      level: 1,
      is18Plus: false,
    },
    {
      id: "3",
      text: "เรื่องที่ไม่เคยบอกใครในวงนี้?",
      type: "QUESTION",
      level: 2,
      is18Plus: false,
    },
    {
      id: "4",
      text: "เคยแอบชอบเพื่อนในกลุ่มไหม?",
      type: "QUESTION",
      level: 2,
      is18Plus: false,
    },
    {
      id: "5",
      text: "โทรหาแฟนเก่าแล้วบอกว่าคิดถึงหมาของเขา",
      type: "DARE",
      level: 2,
      is18Plus: false,
    },
    {
      id: "6",
      text: "ใครนี่คุณคิดจะเป็นคนรวยที่สุด?",
      type: "VOTE",
      level: 1,
      is18Plus: false,
    },
    {
      id: "7",
      text: "ใครที่ใส่เสื้อสีดำ — ดื่มให้หมดแก้ว!",
      type: "CHAOS",
      level: 3,
      is18Plus: false,
    },
    {
      id: "8",
      text: "ถ้าต้องเลือกจีบคนในวงได้ 1 คน เลือกใคร?",
      type: "QUESTION",
      level: 3,
      is18Plus: true,
    },
  ];

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/questions");
        let questions = mockQuestions; // Default to mock

        if (res.ok) {
          const data = await res.json();
          // Handle both array and object with questions property
          if (Array.isArray(data)) {
            questions = data;
          } else if (data.questions && Array.isArray(data.questions)) {
            questions = data.questions;
          }
        }

        // Calculate stats from questions
        const total = questions.length;

        // Count by level
        const levelCounts: { [key: number]: number } = { 1: 0, 2: 0, 3: 0 };
        questions.forEach((q: { level: number }) => {
          if (levelCounts[q.level] !== undefined) {
            levelCounts[q.level]++;
          }
        });

        // Count by type
        const typeCounts: { [key: string]: number } = {};
        questions.forEach((q: { type: string }) => {
          typeCounts[q.type] = (typeCounts[q.type] || 0) + 1;
        });

        setStats({
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
        });
      } catch (error) {
        console.error("Failed to fetch stats, using mock data:", error);
        // Use mock data on error
        const questions = mockQuestions;
        const total = questions.length;
        const levelCounts: { [key: number]: number } = { 1: 0, 2: 0, 3: 0 };
        questions.forEach((q) => {
          if (levelCounts[q.level] !== undefined) {
            levelCounts[q.level]++;
          }
        });
        const typeCounts: { [key: string]: number } = {};
        questions.forEach((q) => {
          typeCounts[q.type] = (typeCounts[q.type] || 0) + 1;
        });
        setStats({
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
        });
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const statCards = [
    {
      label: "คำถามทั้งหมด",
      value: stats?.total ?? 0,
      icon: "quiz",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "ระดับชิลล์",
      value: stats?.byLevel.find((l) => l.level === 1)?.count ?? 0,
      icon: "ac_unit",
      color: "text-neon-blue",
      bg: "bg-neon-blue/10",
    },
    {
      label: "ระดับกลาง",
      value: stats?.byLevel.find((l) => l.level === 2)?.count ?? 0,
      icon: "local_fire_department",
      color: "text-neon-yellow",
      bg: "bg-neon-yellow/10",
    },
    {
      label: "ระดับ 18+",
      value: stats?.byLevel.find((l) => l.level === 3)?.count ?? 0,
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
                  ? `ยินดีต้อนรับ ${adminUser.username}`
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

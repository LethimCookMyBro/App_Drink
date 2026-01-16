"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GlassPanel } from "@/components/ui";

const stats = [
  {
    label: "คำถามทั้งหมด",
    value: "96",
    icon: "quiz",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    label: "ระดับชิลล์",
    value: "22",
    icon: "ac_unit",
    color: "text-neon-blue",
    bg: "bg-neon-blue/10",
  },
  {
    label: "ระดับกลาง",
    value: "27",
    icon: "local_fire_department",
    color: "text-neon-yellow",
    bg: "bg-neon-yellow/10",
  },
  {
    label: "ระดับ 18+",
    value: "47",
    icon: "whatshot",
    color: "text-neon-red",
    bg: "bg-neon-red/10",
  },
];

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

const questionTypes = [
  {
    type: "Q",
    label: "คำถาม",
    count: 66,
    color: "bg-primary",
    text: "text-white",
  },
  {
    type: "D",
    label: "ท้า (Dare)",
    count: 10,
    color: "bg-neon-green",
    text: "text-black",
  },
  {
    type: "C",
    label: "โกลาหล (Chaos)",
    count: 10,
    color: "bg-neon-red",
    text: "text-white",
  },
  {
    type: "V",
    label: "โหวต (Vote)",
    count: 10,
    color: "bg-neon-yellow",
    text: "text-black",
  },
];

export default function AdminDashboard() {
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
                Wong Taek Dashboard
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
          >
            <span className="material-symbols-outlined">home</span>
            <span className="hidden md:inline">หน้าหลัก</span>
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        {/* Stats Grid */}
        <section>
          <h2 className="text-white/40 text-xs font-bold tracking-[0.1em] uppercase mb-4">
            ภาพรวมคำถาม
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {stats.map((stat, index) => (
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
                    {stat.value}
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
                {questionTypes.map((item, index) => (
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
                      {item.count} ข้อ
                    </span>
                  </motion.div>
                ))}
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
                  <li>• คลิก "จัดการคำถาม" เพื่อเพิ่ม แก้ไข หรือลบคำถาม</li>
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

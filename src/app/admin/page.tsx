"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app-shell";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

interface AdminStats {
  playerCount: number;
  totalBets: number;
  bannedCount: number;
  activeArenas: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminStats = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin");
        if (res.ok) {
          const json = await res.json();
          setStats(json.data);
        }
      } catch (err) {
        console.error("Admin stats fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    void fetchAdminStats();
  }, []);

  const handleAction = (actionName: string) => {
    setMsg(`[ADMIN ACTION] ${actionName} signal sent to contract owner gateway.`);
    setTimeout(() => setMsg(null), 4000);
  };

  return (
    <AppShell title="Admin Console">
      <section className="mx-auto max-w-2xl px-5 pt-7 pb-20 space-y-6">
        <motion.p
          className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          Owner-only protocol controls. Ensure contract owner wallet is connected before signing transactions.
        </motion.p>

        {msg && (
          <div className="rounded-xl border border-[#4ce47d]/40 bg-[#4ce47d]/10 p-3 font-mono text-xs text-[#4ce47d]">
            {msg}
          </div>
        )}

        <motion.div
          className="grid grid-cols-2 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {[
            ["TOTAL PLAYERS", loading ? "..." : String(stats?.playerCount || 0)],
            ["TOTAL ROUNDS PLAYED", loading ? "..." : String(stats?.totalBets || 0)],
            ["OPEN ARENAS", loading ? "..." : String(stats?.activeArenas || 0)],
            ["BANNED PLAYERS", loading ? "..." : String(stats?.bannedCount || 0)],
          ].map(([label, value]) => (
            <motion.div
              key={label}
              className="rounded-2xl border border-white/15 bg-white/[.025] p-5 hover:bg-white/[.04] transition"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
            >
              <p className="font-mono text-[10px] tracking-[.12em] text-[#d8cadd]">
                {label}
              </p>
              <b className="mt-3 block text-xl text-[#d5a7ff]">{value}</b>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="grid gap-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {[
            ["EMERGENCY PAUSE CONTRACT", "border-red-400/50", "text-red-300"],
            ["REFUND TIMED-OUT ARENA", "border-white/20", "text-white"],
            ["SET PROTOCOL BET LIMITS", "border-white/20", "text-white"],
          ].map(([label, borderClass, textClass]) => (
            <motion.button
              key={label}
              onClick={() => handleAction(label)}
              className={`rounded-xl border ${borderClass} py-4 font-mono text-sm ${textClass} hover:opacity-80 transition`}
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {label}
            </motion.button>
          ))}
        </motion.div>
      </section>
    </AppShell>
  );
}

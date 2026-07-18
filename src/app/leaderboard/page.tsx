"use client";

import { motion } from "framer-motion";
import { AppShell } from "@/components/app-shell";
import { LoadingState, EmptyState } from "@/components/state-displays";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4 },
  },
};

// TODO: Replace with real API call to /api/leaderboard
const players = [
  ["01", "Void_Runner", "1,842.30"],
  ["02", "0xAres", "1,285.10"],
  ["03", "Holo_G", "970.55"],
  ["04", "Ether0x", "652.80"],
];

export default function LeaderboardPage() {
  const loading = false;

  if (loading) {
    return (
      <AppShell title="Leaderboard">
        <section className="mx-auto max-w-2xl px-5 pt-7">
          <LoadingState />
        </section>
      </AppShell>
    );
  }

  if (players.length === 0) {
    return (
      <AppShell title="Leaderboard">
        <section className="mx-auto max-w-2xl px-5 pt-7">
          <EmptyState message="No players yet. Be the first!" />
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell title="Leaderboard">
      <section className="mx-auto max-w-2xl px-5 pt-7">
        <motion.p
          className="font-mono text-xs tracking-[.18em] text-[#4ce47d]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          SEASON 01 • 18 DAYS REMAINING
        </motion.p>

        <motion.div
          className="mt-6 space-y-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {players.map(([rank, name, won]) => (
            <motion.article
              key={rank}
              className="flex items-center gap-5 rounded-2xl border border-white/15 bg-white/[.025] p-5 hover:bg-white/[.04] transition"
              variants={itemVariants}
              whileHover={{ x: 4 }}
            >
              <b className="text-2xl text-[#d5a7ff]">{rank}</b>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#d5a7ff]/15">
                ◉
              </span>
              <b className="flex-1">{name}</b>
              <span className="font-mono text-[#4ce47d]">{won} USDm</span>
            </motion.article>
          ))}
        </motion.div>
      </section>
    </AppShell>
  );
}

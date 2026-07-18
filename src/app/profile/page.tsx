"use client";

import Link from "next/link";
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
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export default function ProfilePage() {
  return (
    <AppShell title="Player Profile">
      <motion.section
        className="mx-auto max-w-2xl px-5 pt-7"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="rounded-3xl border border-white/15 bg-gradient-to-br from-[#d5a7ff]/15 to-white/[.02] p-7"
          variants={itemVariants}
        >
          <p className="font-mono text-xs tracking-[.18em]">CONNECTED PLAYER</p>
          <h2 className="mt-3 text-3xl font-bold">0x7A3...9F10</h2>
          <span className="mt-5 inline-block rounded-full bg-[#d5a7ff]/20 px-4 py-2 font-mono text-sm text-[#d5a7ff]">
            DIAMOND RANK
          </span>
        </motion.div>

        <motion.div
          className="mt-5 grid grid-cols-3 gap-3 text-center"
          variants={containerVariants}
        >
          {[
            ["2,450", "USDm WON"],
            ["28", "ROUNDS"],
            ["6", "DAY STREAK"],
          ].map(([value, label]) => (
            <motion.div
              key={label}
              className="rounded-2xl border border-white/15 p-4"
              variants={itemVariants}
              whileHover={{ scale: 1.05, borderColor: "rgba(213,167,255,.3)" }}
            >
              <strong className="text-xl text-[#4ce47d]">{value}</strong>
              <p className="mt-2 font-mono text-[9px] tracking-[.1em] text-[#d8cadd]">
                {label}
              </p>
            </motion.div>
          ))}
        </motion.div>

        <motion.button
          className="mt-6 w-full rounded-2xl border border-[#d5a7ff] py-4 font-mono text-sm text-[#d5a7ff] hover:bg-[#d5a7ff]/10 transition"
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            console.log("TODO: Trigger onboarding tour replay");
          }}
        >
          REPLAY ONBOARDING TOUR
        </motion.button>

        <Link
          href="/leaderboard"
          className="mt-4 block text-center font-mono text-xs text-[#4ce47d] hover:text-[#6ef494] transition"
        >
          VIEW SEASON LEADERBOARD →
        </Link>
      </motion.section>
    </AppShell>
  );
}

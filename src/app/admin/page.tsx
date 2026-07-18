"use client";

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

export default function AdminPage() {
  return (
    <AppShell title="Admin Console">
      <section className="mx-auto max-w-2xl px-5 pt-7">
        <motion.p
          className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          Owner-only controls. Connect the contract owner wallet before enabling
          any action.
        </motion.p>

        <motion.div
          className="mt-6 grid grid-cols-2 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {[
            ["ARENA POT", "2,450 USDm"],
            ["ACTIVE ROUNDS", "3"],
            ["PROTOCOL FEES", "122.5 USDm"],
            ["PAUSE STATUS", "ACTIVE"],
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
          className="mt-6 grid gap-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {[
            ["EMERGENCY PAUSE", "border-red-400/50", "text-red-300"],
            ["REFUND TIMED-OUT ARENA", "border-white/20", "text-white"],
            ["SET BET LIMITS", "border-white/20", "text-white"],
          ].map(([label, borderClass, textClass]) => (
            <motion.button
              key={label}
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

"use client";

import { motion } from "framer-motion";
import { AppShell } from "@/components/app-shell";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
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

export default function VerifyPage() {
  const round = "842";

  return (
    <AppShell title="Verify Fairness">
      <motion.section
        className="mx-auto max-w-2xl px-5 pt-7"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.p className="text-[#d8cadd]" variants={itemVariants}>
          Independently validate the immutable commitment for round #{round}.
          No backend RNG is used.
        </motion.p>

        <motion.div
          className="mt-6 space-y-4 rounded-2xl border border-white/15 bg-white/[.025] p-5 font-mono text-xs"
          variants={containerVariants}
        >
          <motion.p variants={itemVariants}>
            <span className="text-[#d5a7ff]">COMMIT HASH</span>
            <br />
            0x4b15a4e5b3202c4b8d11f2e090b1f6f912e310e7c7dcd7
          </motion.p>

          <motion.p variants={itemVariants}>
            <span className="text-[#d5a7ff]">SERVER SEED</span>
            <br />
            0x7e5a...a92d
          </motion.p>

          <motion.p variants={itemVariants}>
            <span className="text-[#d5a7ff]">CLIENT SEED / NONCE</span>
            <br />
            0x7A3...9F10 / 1
          </motion.p>

          <motion.p variants={itemVariants}>
            <span className="text-[#d5a7ff]">VRF RANDOM</span>
            <br />
            894235197823451987234519872345198723
          </motion.p>
        </motion.div>

        <motion.button
          className="mt-6 w-full rounded-2xl bg-[#4ce47d] py-4 font-black text-black hover:scale-[1.02] transition"
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          RECOMPUTE NUMBERS
        </motion.button>
      </motion.section>
    </AppShell>
  );
}

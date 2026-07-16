"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { BetInput } from "@/components/bet-input";
import { Card3D } from "@/components/card-3d";

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
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

export default function SoloPage() {
  const [bet, setBet] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const play = () => {
    if (picked !== null && Number(bet) > 0) setRevealed(true);
  };

  return (
    <AppShell title="Solo Prediction">
      <motion.section
        className="mx-auto max-w-2xl px-5 pt-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Balance Card */}
        <motion.div
          className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/[.08] to-white/[.02] p-7"
          variants={itemVariants}
          whileHover={{ borderColor: "rgba(213,167,255,.3)" }}
        >
          <p className="font-mono text-xs tracking-[.18em] text-[#bfb3c6]">CURRENT BALANCE</p>
          <motion.p
            className="mt-3 text-3xl font-bold text-[#d5a7ff]"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            2,450.00 USDm
          </motion.p>
        </motion.div>

        {/* Bet Input Section */}
        <motion.div className="mt-9" variants={itemVariants}>
          <BetInput value={bet} onChange={setBet} />
          <motion.div
            className="mt-5 flex justify-between font-mono text-sm tracking-[.12em]"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <span>MULTIPLIER</span>
            <span className="text-3xl font-black text-[#4ce47d]">1.95x</span>
          </motion.div>
        </motion.div>

        {/* Card Selection */}
        <motion.div
          className="mt-20 grid grid-cols-2 gap-4"
          variants={containerVariants}
        >
          {["LEFT PATH", "RIGHT PATH"].map((label, index) => (
            <motion.div key={label} variants={itemVariants}>
              <Card3D
                label={label}
                selected={picked === index}
                revealed={revealed}
                value={index === 1 ? 100 : 42}
                onClick={() => !revealed && setPicked(index)}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Submit Button */}
        <motion.button
          onClick={play}
          disabled={picked === null || !bet || revealed}
          className="mt-8 w-full rounded-2xl bg-[#4ce47d] py-4 text-xl font-black text-black disabled:cursor-not-allowed disabled:opacity-40 transition"
          variants={itemVariants}
          whileHover={{ scale: 1.02, boxShadow: "0 0 28px rgba(76,228,125,.3)" }}
          whileTap={{ scale: 0.98 }}
        >
          {revealed ? "ROUND REVEALED" : "LOCK IN PREDICTION"}
        </motion.button>
      </motion.section>
    </AppShell>
  );
}

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app-shell";
import { BetInput } from "@/components/bet-input";
import { Card3D } from "@/components/card-3d";
import { Confetti } from "@/components/confetti";
import { EmptyState } from "@/components/state-displays";

export default function SoloPage() {
  const [bet, setBet] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [loading, setLoading] = useState(false);
  const balance = 2450.0;

  const play = async () => {
    if (picked === null || !bet || revealed) return;
    
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRevealed(true);
    setLoading(false);
    
    // Show confetti on win (random)
    if (Math.random() > 0.5) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1000);
    }
  };

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
      transition: { duration: 0.6 },
    },
  };

  if (!balance) {
    return (
      <AppShell title="Solo Prediction">
        <section className="mx-auto max-w-2xl px-5 pt-8">
          <EmptyState message="No balance. Try daily free play first!" />
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell title="Solo Prediction">
      <motion.section
        className="mx-auto max-w-2xl px-5 pt-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {showConfetti && <Confetti />}

        <motion.div
          className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/[.08] to-white/[.02] p-7"
          variants={itemVariants}
        >
          <p className="font-mono text-xs tracking-[.18em] text-[#bfb3c6]">
            CURRENT BALANCE
          </p>
          <p className="mt-3 text-3xl font-bold text-[#d5a7ff]">
            {balance.toFixed(2)} USDm
          </p>
        </motion.div>

        <motion.div className="mt-9" variants={itemVariants}>
          <BetInput value={bet} onChange={setBet} />
          <div className="mt-5 flex justify-between font-mono text-sm tracking-[.12em]">
            <span>MULTIPLIER</span>
            <span className="text-3xl font-black text-[#4ce47d]">1.95x</span>
          </div>
        </motion.div>

        <motion.div
          className="mt-20 grid grid-cols-2 gap-4"
          variants={itemVariants}
        >
          {["LEFT PATH", "RIGHT PATH"].map((label, index) => (
            <Card3D
              key={label}
              label={label}
              selected={picked === index}
              revealed={revealed}
              value={index === 1 ? 100 : 42}
              onClick={() => !revealed && !loading && setPicked(index)}
            />
          ))}
        </motion.div>

        <motion.button
          onClick={play}
          disabled={picked === null || !bet || revealed || loading}
          className="mt-8 w-full rounded-2xl bg-[#4ce47d] py-4 text-xl font-black text-black disabled:cursor-not-allowed disabled:opacity-40 transition hover:scale-[1.02]"
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
        >
          {loading ? "PROCESSING..." : revealed ? "ROUND REVEALED" : "LOCK IN PREDICTION"}
        </motion.button>
      </motion.section>
    </AppShell>
  );
}

"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import { Gamepad2, History, Trophy, UserRound } from "lucide-react";
import { XolatLogoSmall } from "@/components/xolat-logo-small";

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

const tickerVariants = {
  animate: {
    x: ["0%", "-100%"],
    transition: {
      duration: 30,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

export default function Home() {
  const [connected, setConnected] = useState(false);

  const navItems = [
    { href: "/", label: "ARENA", icon: Gamepad2 },
    { href: "/solo", label: "SOLO", icon: Trophy },
    { href: "/history", label: "HISTORY", icon: History },
    { href: "/profile", label: "PROFILE", icon: UserRound },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#080709] pb-28 text-[#f4eef8]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0a0d]/90 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <XolatLogoSmall className="w-10 h-8" />
            </motion.div>
            <span className="text-3xl font-black italic tracking-[-0.09em] text-[#d6a8ff]">XOPREDICT</span>
          </Link>
          <motion.button 
            onClick={() => {}}
            className="rounded-full border border-[#8d739c] bg-[#211a27] px-4 py-2 font-mono text-xs tracking-[.16em] text-[#e1c3ff] transition hover:border-[#d3a4ff]"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            whileHover={{ scale: 1.05 }}
          >
            CONNECT
          </motion.button>
        </div>
      </header>

      {/* Hero Section */}
      <motion.section
        className="relative mx-auto flex min-h-[430px] max-w-6xl flex-col items-center justify-center px-5 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_50%_20%,rgba(178,112,255,.18),transparent_43%)]" />
        
        <motion.div
          className="relative text-7xl font-black text-[#f6efff]"
          variants={itemVariants}
          animate={{
            scale: [1, 1.05, 1],
            opacity: [1, 0.9, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          P
        </motion.div>

        <motion.p
          className="relative mt-28 max-w-md text-base leading-7 text-[#dfd5e6]"
          variants={itemVariants}
        >
          The next-gen liquidity prediction protocol.<br />Harness market volatility and multiply your<br />USDm holdings.
        </motion.p>

        <motion.button
          onClick={() => setConnected(true)}
          className="relative mt-12 rounded-2xl bg-[#4ce47d] px-6 py-4 text-xl font-black tracking-[.05em] text-black shadow-[0_0_28px_rgba(76,228,125,.25)] transition hover:scale-[1.03]"
          variants={itemVariants}
          whileHover={{ scale: 1.08, boxShadow: "0 0 40px rgba(76,228,125,.35)" }}
          whileTap={{ scale: 0.95 }}
        >
          CONNECT WALLET
        </motion.button>

        <motion.button
          className="relative mt-9 w-full max-w-[340px] rounded-xl border border-white/15 bg-white/[.025] py-4 font-mono text-xs tracking-[.2em] text-[#e7dce9] transition hover:bg-white/[.07]"
          variants={itemVariants}
          whileHover={{ borderColor: "#d5a7ff", backgroundColor: "rgba(255,255,255,0.1)" }}
        >
          ◉ &nbsp; SIGN IN WITH GOOGLE
        </motion.button>
      </motion.section>

      {/* Content Section */}
      <motion.section
        className="mx-auto max-w-6xl px-5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Active Pool Card */}
        <motion.div
          className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/[.06] to-white/[.015] p-4 shadow-2xl"
          variants={itemVariants}
          whileHover={{ borderColor: "rgba(213,167,255,.3)" }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="font-mono text-xs tracking-[.15em] text-[#d7cbdc]">ACTIVE POOL</div>
              <h2 className="mt-1 text-2xl font-bold text-[#d5a7ff]">BTC/USDm</h2>
            </div>
            <motion.span
              className="rounded-full border border-[#1f9d57] px-3 py-1 font-mono text-[10px] text-[#50e383]"
              animate={{ backgroundColor: "rgba(31, 157, 87, 0.1)" }}
              transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
            >
              LIVE
            </motion.span>
          </div>
          <div className="mt-6 flex justify-between font-mono text-xs text-[#d8cadd]">
            <span>Predicted Growth</span>
            <span>84% Bullish</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#2a282c]">
            <motion.div
              className="h-full w-[84%] rounded-full bg-gradient-to-r from-[#d5a7ff] to-[#49e27c]"
              initial={{ width: 0 }}
              animate={{ width: "84%" }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </motion.div>

        {/* Feature Cards */}
        <motion.div className="mt-4 grid grid-cols-2 gap-4" variants={containerVariants}>
          <motion.article
            className="rounded-2xl border border-white/15 bg-white/[.025] p-4"
            variants={itemVariants}
            whileHover={{ scale: 1.02, borderColor: "rgba(213,167,255,.3)" }}
          >
            <div className="text-3xl text-[#d5a7ff]">♢</div>
            <h3 className="mt-7 text-lg font-bold">Provably Fair</h3>
            <p className="mt-3 text-sm leading-5 text-[#dad0df]">Every prediction outcome is cryptographically verified on-chain in USDm.</p>
            <motion.button
              className="mt-5 font-mono text-[10px] tracking-[.12em] text-[#4ce47d]"
              whileHover={{ color: "#6ef494" }}
            >
              ◉ VERIFY FAIRNESS
            </motion.button>
          </motion.article>

          <motion.article
            className="rounded-2xl border border-white/15 bg-gradient-to-br from-[#1e1823] to-white/[.02] p-4"
            variants={itemVariants}
            whileHover={{ scale: 1.02, borderColor: "rgba(76,226,124,.3)" }}
          >
            <div className="text-3xl text-[#4ce47d]">♧</div>
            <h3 className="mt-7 text-lg font-bold">Instant Payouts</h3>
            <p className="mt-3 text-sm leading-5 text-[#dad0df]">No withdrawals. Your winnings are sent directly to your wallet.</p>
          </motion.article>
        </motion.div>

        {/* Global Arena Card */}
        <motion.article
          className="mt-16 overflow-hidden rounded-2xl border border-white/15 bg-[radial-gradient(circle_at_50%_60%,rgba(190,132,255,.2),transparent_25%),radial-gradient(circle_at_100%_0%,rgba(74,226,124,.15),transparent_38%)] px-5 py-20 text-center"
          variants={itemVariants}
          whileHover={{ scale: 1.02, borderColor: "rgba(213,167,255,.3)" }}
        >
          <motion.div
            className="text-6xl text-[#d5a7ff]"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            ▣
          </motion.div>
          <h2 className="mt-10 text-2xl font-bold">Global Arena</h2>
          <p className="mx-auto mt-3 max-w-xs text-sm text-[#ded4e2]">Compete with thousands for the highest USDm multipliers.</p>
        </motion.article>
      </motion.section>

      {/* Ticker */}
      <div className="mt-7 overflow-hidden border-y border-white/5 bg-black">
        <motion.div
          className="flex whitespace-nowrap py-3 font-mono text-[10px] tracking-[.15em] text-[#45df7a]"
          variants={tickerVariants}
          animate="animate"
        >
          <span className="px-4">0xABC... WON 12.3 USDm</span>
          <span className="px-4">0x4F2... WON 45.0 USDm</span>
          <span className="px-4">VOID_RUNNER JOINED ARENA #842</span>
          <span className="px-4">0xABC... WON 12.3 USDm</span>
          <span className="px-4">0x4F2... WON 45.0 USDm</span>
          <span className="px-4">VOID_RUNNER JOINED ARENA #842</span>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="fixed bottom-0 z-30 flex w-full justify-around border border-white/15 bg-[#0c0b0e]/95 px-4 pb-5 pt-3 backdrop-blur-xl">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-w-14 flex-col items-center gap-1 font-mono text-[10px] tracking-[.1em] text-[#d5a7ff] transition hover:text-white"
          >
            <item.icon size={21} />
            {item.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}

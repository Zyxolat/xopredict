"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Gamepad2,
  Trophy,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Flame,
  Users,
  Award,
  ChevronDown,
  Zap,
  Lock,
  Globe,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { LiveFeed } from "@/components/live-feed";
import { DailyFreePlay } from "@/components/daily-free-play";
import { useUsdmBalance } from "@/lib/hooks/useUsdmBalance";
import { useAccount } from "wagmi";

// ─────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────

interface OpenArena {
  id: string;
  arenaId: string;
  creatorAddress: string;
  betAmount: string;
  maxPlayers: number;
  currentPlayers: number;
  status: string;
}

interface LeaderboardPlayer {
  position: number;
  address: string;
  username: string | null;
  totalWonUsdm: number;
  rank: string;
}

// ─────────────────────────────────────────────────────────
// Animation variants
// ─────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

// ─────────────────────────────────────────────────────────
// Public Landing Page (anonymous)
// ─────────────────────────────────────────────────────────

function PublicLandingPage() {
  const [openArenas, setOpenArenas] = useState<OpenArena[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPlayer[]>([]);
  const [isLoadingArenas, setIsLoadingArenas] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const fetchPreviewData = async () => {
      setIsLoadingArenas(true);
      try {
        const [arenasRes, rankRes] = await Promise.all([
          fetch("/api/arenas?limit=3&status=OPEN").catch(() => null),
          fetch("/api/leaderboard?limit=5").catch(() => null),
        ]);
        if (arenasRes?.ok) {
          const json = await arenasRes.json();
          setOpenArenas(json.data?.arenas || []);
        }
        if (rankRes?.ok) {
          const json = await rankRes.json();
          setLeaderboard(json.data?.leaderboard || []);
        }
      } catch (err) {
        console.error("Landing page fetch error:", err);
      } finally {
        setIsLoadingArenas(false);
      }
    };
    void fetchPreviewData();
  }, []);

  const features = [
    {
      icon: ShieldCheck,
      title: "Provably Fair",
      desc: "Every outcome is derived from Witnet Oracle VRF randomness on Celo. Server seeds are committed on-chain before player selection.",
      color: "#4ce47d",
    },
    {
      icon: Zap,
      title: "Instant Settlement",
      desc: "Smart contracts settle rounds automatically. No waiting, no trust required — your USDm is transferred on-chain in seconds.",
      color: "#d5a7ff",
    },
    {
      icon: Lock,
      title: "Non-Custodial",
      desc: "We never hold your funds. Your wallet is your account. USDm stays in the contract until the winner is cryptographically determined.",
      color: "#4ce47d",
    },
    {
      icon: Globe,
      title: "Celo Native",
      desc: "Built on Celo for fast, low-cost transactions. Play global 1-on-1 prediction battles or join multi-player arena rooms.",
      color: "#d5a7ff",
    },
    {
      icon: TrendingUp,
      title: "95% Pot to Winner",
      desc: "Arena winners receive 95% of the total pot. The smallest platform fee in Web3 gaming — more of every pot goes to players.",
      color: "#4ce47d",
    },
    {
      icon: Users,
      title: "Season Leaderboards",
      desc: "Compete in seasonal XP ladders. Top performers earn exclusive cosmetics, VIP passes, and early access to new game modes.",
      color: "#d5a7ff",
    },
  ];

  const faqs = [
    {
      q: "What is XoPredict?",
      a: "XoPredict is a provably fair on-chain prediction game built on Celo. Players predict card outcomes — the highest-score player wins up to 95% of the pot. All randomness is sourced from Witnet Oracle VRF, auditable by anyone.",
    },
    {
      q: "What token is used to play?",
      a: "All bets and winnings are denominated in USDm — a stablecoin on Celo. You need USDm in your wallet to enter arenas or solo matches.",
    },
    {
      q: "How do I get started?",
      a: "Create an account, verify your email, then go to Settings → Linked Wallets to connect your EVM wallet. Once your wallet is linked, you're ready to play.",
    },
    {
      q: "Is XoPredict provably fair?",
      a: "Yes. The server seed is committed on-chain before any player picks their card. The final randomness comes from Witnet VRF — a decentralized oracle. You can verify any round result on the Verify page.",
    },
    {
      q: "Can I play without a wallet?",
      a: "You can browse the platform without a wallet. To place bets and play matches, you need to link a Celo-compatible EVM wallet (e.g. MetaMask, Rainbow, or any WalletConnect-compatible wallet).",
    },
    {
      q: "What happens if a round fails or expires?",
      a: "All bets are refunded on-chain automatically if a round expires without settlement. The smart contract never holds funds indefinitely.",
    },
  ];

  const stats = [
    { label: "Total Rounds Played", value: "12,400+", color: "#4ce47d" },
    { label: "Total USDm in Pots", value: "$840K+", color: "#d5a7ff" },
    { label: "Active Players", value: "3,200+", color: "#4ce47d" },
    { label: "Avg Win Multiplier", value: "1.95×", color: "#d5a7ff" },
  ];

  return (
    <div className="min-h-screen bg-[#08070a] text-[#f4eef8] font-sans">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#08070a]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 text-2xl font-black italic tracking-[-.06em] text-[#d6a8ff]"
          >
            ⬡ XOLAT
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 font-mono text-xs tracking-widest text-[#a79cae]">
            <Link href="/arena" className="hover:text-white transition">ARENA</Link>
            <Link href="/solo" className="hover:text-white transition">SOLO</Link>
            <Link href="/leaderboard" className="hover:text-white transition">LEADERBOARD</Link>
            <Link href="#how-it-works" className="hover:text-white transition">HOW TO PLAY</Link>
            <Link href="#faq" className="hover:text-white transition">ABOUT</Link>
          </nav>

          {/* Auth CTA & Mobile button */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full border border-white/20 px-5 py-2 font-mono text-xs font-bold text-white hover:bg-white/10 transition"
            >
              LOGIN
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-gradient-to-r from-[#d5a7ff] to-[#a855f7] px-5 py-2 font-mono text-xs font-bold text-black shadow-lg shadow-[#d5a7ff]/20 hover:scale-[1.03] active:scale-[0.98] transition"
            >
              SIGN UP
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <motion.section
        className="relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Background glows */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,rgba(213,167,255,0.25),transparent_60%)] pointer-events-none" />
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-[#d5a7ff]/10 blur-[130px] pointer-events-none" />
        <div className="absolute top-20 right-1/4 h-64 w-64 rounded-full bg-[#4ce47d]/8 blur-[100px] pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-5 py-24 md:py-36 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d5a7ff]/30 bg-[#d5a7ff]/10 px-5 py-2 font-mono text-xs font-bold text-[#d5a7ff] mb-8">
              <Sparkles size={14} />
              PROVABLY FAIR PREDICTION PROTOCOL ON CELO
            </div>
          </motion.div>

          <motion.h1
            className="text-5xl md:text-7xl lg:text-8xl font-black italic tracking-tight text-white leading-[0.95] mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            PREDICT.{" "}
            <span className="bg-gradient-to-r from-[#d5a7ff] to-[#a855f7] bg-clip-text text-transparent">
              MULTIPLY.
            </span>
            <br />
            WIN USDm.
          </motion.h1>

          <motion.p
            className="mx-auto max-w-xl text-base md:text-lg leading-relaxed text-[#c4b6cc] mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Enter high-stakes card prediction battles on Celo. High score claims up to 95% of the total pot,
            cryptographically verified by Witnet VRF. Non-custodial, transparent, fair.
          </motion.p>

          <motion.div
            className="flex flex-wrap items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Link
              href="/register"
              className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#4ce47d] to-[#2ecb5f] px-8 py-4 font-bold text-black shadow-xl shadow-[#4ce47d]/25 hover:scale-[1.04] active:scale-[0.98] transition text-sm"
            >
              <Trophy size={18} /> CREATE FREE ACCOUNT
            </Link>
            <Link
              href="/arena"
              className="flex items-center gap-2.5 rounded-2xl border border-white/20 bg-white/8 px-8 py-4 font-bold text-white hover:bg-[#d5a7ff] hover:text-black hover:border-[#d5a7ff] transition text-sm"
            >
              <Gamepad2 size={18} /> EXPLORE ARENAS
            </Link>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            className="mt-16 flex justify-center"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ChevronDown size={20} className="text-[#6e6878]" />
          </motion.div>
        </div>
      </motion.section>

      {/* ── STATS BAR ── */}
      <section className="border-y border-white/8 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-5 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <motion.div
              key={s.label}
              className="text-center"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <p className="text-3xl md:text-4xl font-black" style={{ color: s.color }}>
                {s.value}
              </p>
              <p className="mt-1 font-mono text-[10px] tracking-[.12em] text-[#8e8892] uppercase">
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-24">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="font-mono text-xs tracking-[.2em] text-[#d5a7ff] mb-3">HOW IT WORKS</p>
          <h2 className="text-3xl md:text-4xl font-black text-white">Simple. Fair. Provable.</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: "01", title: "Register & Verify", desc: "Create your account and verify your email. Then head to Settings → Linked Wallets to connect your Celo EVM wallet.", icon: "🛡️" },
            { step: "02", title: "Enter a Match", desc: "Join an open arena or challenge a solo round. Pick your card. Your USDm bet is locked in the smart contract.", icon: "🃏" },
            { step: "03", title: "Win Your Pot", desc: "Witnet VRF delivers randomness on-chain. The smart contract settles the round — 95% of the pot goes to the winner.", icon: "🏆" },
          ].map((step, i) => (
            <motion.div
              key={i}
              className="group relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-7 hover:border-[#d5a7ff]/40 transition"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="text-4xl mb-4">{step.icon}</div>
              <div className="font-mono text-[10px] tracking-[.2em] text-[#d5a7ff] mb-2">STEP {step.step}</div>
              <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
              <p className="text-sm leading-relaxed text-[#a79cae]">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── ARENA PREVIEW ── */}
      <section className="mx-auto max-w-7xl px-5 pb-20">
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Gamepad2 className="text-[#d5a7ff]" /> Live Open Arenas
            </h2>
            <p className="text-xs text-[#a79cae] mt-1">Sign up to join or create your own USDm battle</p>
          </div>
          <Link
            href="/arena"
            className="flex items-center gap-1 font-mono text-xs text-[#d5a7ff] hover:text-white transition"
          >
            VIEW ALL <ArrowRight size={14} />
          </Link>
        </motion.div>

        {isLoadingArenas ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl border border-white/10 bg-white/[0.02]" />
            ))}
          </div>
        ) : openArenas.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
            <p className="text-sm text-[#ded4e2]">No open arenas right now.</p>
            <Link
              href="/register"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#d5a7ff] px-6 py-3 font-bold text-black"
            >
              Create Your Arena
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {openArenas.map((arena) => (
              <motion.div
                key={arena.id}
                className="rounded-2xl border border-white/15 bg-white/[0.03] p-5 hover:border-[#d5a7ff]/50 transition flex flex-col justify-between"
                whileHover={{ y: -2 }}
              >
                <div>
                  <div className="flex justify-between items-center font-mono text-xs">
                    <span className="text-[#d5a7ff] font-bold">Arena #{arena.arenaId}</span>
                    <span className="rounded-full border border-[#4ce47d]/40 bg-[#4ce47d]/10 px-2.5 py-0.5 text-[#4ce47d]">
                      {arena.status}
                    </span>
                  </div>
                  <div className="mt-4">
                    <p className="font-mono text-[10px] text-[#8e8892]">ENTRY BET</p>
                    <p className="text-2xl font-black text-white">{arena.betAmount} USDm</p>
                  </div>
                </div>
                <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="flex items-center gap-1 font-mono text-xs text-[#a79cae]">
                    <Users size={14} /> {arena.currentPlayers}/{arena.maxPlayers}
                  </span>
                  <Link
                    href="/register"
                    className="rounded-xl bg-white/10 hover:bg-[#d5a7ff] px-4 py-2 font-mono text-xs font-bold text-white hover:text-black transition"
                  >
                    JOIN →
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ── LEADERBOARD PREVIEW ── */}
      <section className="border-t border-white/8 bg-white/[0.015] py-20">
        <div className="mx-auto max-w-7xl px-5">
          <motion.div
            className="flex items-center justify-between mb-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Award className="text-yellow-400" /> Top Players This Season
            </h2>
            <Link href="/leaderboard" className="font-mono text-xs text-[#4ce47d] hover:underline">
              FULL LEADERBOARD →
            </Link>
          </motion.div>

          <div className="space-y-2 max-w-2xl">
            {leaderboard.length === 0 ? (
              <div className="rounded-2xl border border-white/10 p-6 text-center text-xs text-[#8e8892]">
                No player records yet. Start playing to rank up!
              </div>
            ) : (
              leaderboard.slice(0, 5).map((p, i) => (
                <motion.div
                  key={p.address}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 font-mono text-xs hover:border-white/20 transition"
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-bold w-6 text-center ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-600" : "text-[#d5a7ff]"}`}>
                      #{p.position}
                    </span>
                    <span className="text-white">
                      {p.username || `${p.address.slice(0, 6)}...${p.address.slice(-4)}`}
                    </span>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] text-[#8e8892]">
                      {p.rank}
                    </span>
                  </div>
                  <span className="text-[#4ce47d] font-bold">
                    {p.totalWonUsdm.toFixed(2)} USDm
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="mx-auto max-w-7xl px-5 py-24">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="font-mono text-xs tracking-[.2em] text-[#4ce47d] mb-3">WHY XOPREDICT</p>
          <h2 className="text-3xl md:text-4xl font-black text-white">
            Built for players who demand fairness
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={i}
              className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 hover:border-white/20 transition group"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ y: -3 }}
            >
              <div
                className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: `${f.color}18`, border: `1px solid ${f.color}30` }}
              >
                <f.icon size={20} style={{ color: f.color }} />
              </div>
              <h3 className="font-bold text-white mb-2">{f.title}</h3>
              <p className="text-xs leading-relaxed text-[#a79cae]">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── SOLO MODE CTA ── */}
      <section className="mx-auto max-w-7xl px-5 pb-20">
        <motion.div
          className="rounded-3xl border border-[#4ce47d]/20 bg-gradient-to-br from-[#0d1f15] via-[#081208] to-black p-10 md:p-14 text-center relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(76,228,125,0.12),transparent_60%)] pointer-events-none" />
          <div className="relative z-10">
            <p className="font-mono text-xs tracking-[.2em] text-[#4ce47d] mb-4">SOLO MODE</p>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
              Challenge the house.<br />
              <span className="text-[#4ce47d]">Win 1.95×</span> your bet.
            </h2>
            <p className="max-w-md mx-auto text-sm text-[#c4b6cc] mb-8">
              Enter solo 1v1 prediction rounds against the smart contract. Pick the highest card —
              win 1.95× your USDm. No opponents needed. Play any time.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2.5 rounded-2xl bg-[#4ce47d] px-8 py-4 font-bold text-black shadow-xl shadow-[#4ce47d]/25 hover:scale-[1.04] active:scale-[0.98] transition"
            >
              <Trophy size={18} /> START PLAYING FREE
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="border-t border-white/8 bg-white/[0.015] py-24">
        <div className="mx-auto max-w-3xl px-5">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="font-mono text-xs tracking-[.2em] text-[#d5a7ff] mb-3">QUESTIONS</p>
            <h2 className="text-3xl font-black text-white">Frequently Asked</h2>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                className="rounded-2xl border border-white/10 bg-white/[0.025] overflow-hidden"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
              >
                <button
                  className="flex w-full items-center justify-between px-6 py-4 text-left font-bold text-white hover:text-[#d5a7ff] transition"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span>{faq.q}</span>
                  <motion.div animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={16} className="text-[#d5a7ff]" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <p className="px-6 pb-5 text-sm leading-relaxed text-[#a79cae]">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/10 bg-[#06050a] py-12">
        <div className="mx-auto max-w-7xl px-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="text-2xl font-black italic tracking-[-.06em] text-[#d6a8ff]">
              ⬡ XOLAT
            </Link>
            <div className="flex flex-wrap items-center justify-center gap-6 font-mono text-xs text-[#6e6878]">
              <Link href="/arena" className="hover:text-[#d5a7ff] transition">Arena</Link>
              <Link href="/solo" className="hover:text-[#d5a7ff] transition">Solo</Link>
              <Link href="/leaderboard" className="hover:text-[#d5a7ff] transition">Leaderboard</Link>
              <Link href="/verify" className="hover:text-[#4ce47d] transition">Verify Fairness</Link>
              <Link href="/register" className="hover:text-white transition">Sign Up</Link>
              <Link href="/login" className="hover:text-white transition">Login</Link>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] text-[#4ce47d]">
              <ShieldCheck size={14} />
              PROVABLY FAIR • CELO • USDm
            </div>
          </div>
          <p className="mt-8 text-center font-mono text-[10px] text-[#4e4755]">
            © {new Date().getFullYear()} XoPredict. Built on Celo. Randomness by Witnet Oracle VRF.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Authenticated Dashboard (existing logged-in view)
// ─────────────────────────────────────────────────────────

function AuthenticatedDashboard() {
  const { isConnected, address } = useAccount();
  const { balance } = useUsdmBalance();
  const [openArenas, setOpenArenas] = useState<OpenArena[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPlayer[]>([]);
  const [isLoadingArenas, setIsLoadingArenas] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingArenas(true);
      try {
        const [arenasRes, rankRes] = await Promise.all([
          fetch("/api/arenas?limit=3&status=OPEN").catch(() => null),
          fetch("/api/leaderboard?limit=5").catch(() => null),
        ]);
        if (arenasRes?.ok) {
          const json = await arenasRes.json();
          setOpenArenas(json.data?.arenas || []);
        }
        if (rankRes?.ok) {
          const json = await rankRes.json();
          setLeaderboard(json.data?.leaderboard || []);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setIsLoadingArenas(false);
      }
    };
    void fetchData();
  }, []);

  return (
    <AppShell>
      <motion.div
        className="mx-auto max-w-6xl px-5 pt-4 pb-20 space-y-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero Section */}
        <motion.section
          className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#1c1429] via-[#0e0a16] to-black p-8 md:p-12 shadow-2xl"
          variants={itemVariants}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(213,167,255,0.18),transparent_50%)]" />
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d5a7ff]/30 bg-[#d5a7ff]/10 px-4 py-1.5 font-mono text-xs font-bold text-[#d5a7ff]">
                <Sparkles size={14} /> PROVABLY FAIR PREDICTION PROTOCOL
              </div>
              <h1 className="text-4xl md:text-6xl font-black italic tracking-tight text-white leading-tight">
                PREDICT. MULTIPLY. <span className="text-[#d5a7ff]">WIN USDm.</span>
              </h1>
              <p className="text-sm md:text-base leading-relaxed text-[#dad0df] max-w-lg">
                Enter high-stakes card prediction battles on Celo. High score claims up to 95% of the total pot, cryptographically verified by Witnet VRF.
              </p>
              <div className="pt-4 flex flex-wrap items-center gap-4">
                <Link
                  href="/solo"
                  className="flex items-center gap-2.5 rounded-2xl bg-[#4ce47d] px-7 py-4 font-bold text-black shadow-lg shadow-[#4ce47d]/20 hover:scale-[1.03] active:scale-[0.98] transition"
                >
                  <Trophy size={20} /> PLAY SOLO 1v1
                </Link>
                <Link
                  href="/arena"
                  className="flex items-center gap-2.5 rounded-2xl border border-white/20 bg-white/10 px-7 py-4 font-bold text-white hover:bg-[#d5a7ff] hover:text-black transition"
                >
                  <Gamepad2 size={20} /> MULTIPLAYER ARENA
                </Link>
              </div>
            </div>

            {/* Wallet Overview Widget */}
            <div className="md:col-span-5 rounded-2xl border border-white/15 bg-black/50 p-6 backdrop-blur-md space-y-4">
              <div className="flex justify-between items-center font-mono text-xs text-[#a79cae]">
                <span>WALLET STATUS</span>
                <span className={isConnected ? "text-[#4ce47d]" : "text-yellow-400"}>
                  ● {isConnected ? "CONNECTED" : "NOT CONNECTED"}
                </span>
              </div>
              <div>
                <p className="font-mono text-xs text-[#ded4e2]">USDm BALANCE</p>
                <p className="text-3xl font-black text-[#d5a7ff]">
                  {isConnected ? balance.toFixed(2) : "0.00"} USDm
                </p>
                {address && (
                  <p className="mt-1 font-mono text-[10px] text-[#8e8892]">
                    {address.slice(0, 8)}...{address.slice(-6)}
                  </p>
                )}
              </div>
              <div className="pt-2 grid grid-cols-2 gap-3 text-center font-mono text-xs">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[#8e8892] text-[10px]">SOLO MULTIPLIER</p>
                  <p className="mt-1 font-bold text-[#4ce47d]">1.95x</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[#8e8892] text-[10px]">ARENA CUT</p>
                  <p className="mt-1 font-bold text-[#d5a7ff]">95% POT</p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Live Activity & Daily Reward */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <motion.div className="md:col-span-7" variants={itemVariants}>
            <div className="flex items-center justify-between pb-3">
              <h2 className="flex items-center gap-2 font-mono text-xs font-bold tracking-widest text-[#ded4e2] uppercase">
                <Flame className="text-[#4ce47d]" size={16} /> LIVE PLATFORM ACTIVITY
              </h2>
            </div>
            <LiveFeed />
          </motion.div>
          <motion.div className="md:col-span-5" variants={itemVariants}>
            <div className="flex items-center justify-between pb-3">
              <h2 className="flex items-center gap-2 font-mono text-xs font-bold tracking-widest text-[#ded4e2] uppercase">
                <Sparkles className="text-[#d5a7ff]" size={16} /> DAILY FREE REWARD
              </h2>
            </div>
            <DailyFreePlay />
          </motion.div>
        </div>

        {/* Open Arenas Preview */}
        <motion.section className="space-y-4" variants={itemVariants}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Gamepad2 className="text-[#d5a7ff]" /> Open Arenas
              </h2>
              <p className="text-xs text-[#a79cae]">Join open rooms or create your own USDm battle</p>
            </div>
            <Link
              href="/arena"
              className="flex items-center gap-1 font-mono text-xs text-[#d5a7ff] hover:text-white transition"
            >
              VIEW ALL ARENAS <ArrowRight size={14} />
            </Link>
          </div>

          {isLoadingArenas ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-2xl border border-white/10 bg-white/[0.02]" />
              ))}
            </div>
          ) : openArenas.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
              <p className="text-sm text-[#ded4e2]">No public arenas open right now.</p>
              <Link
                href="/arena"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#d5a7ff] px-5 py-2.5 font-bold text-black"
              >
                Create an Arena
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {openArenas.map((arena) => (
                <div
                  key={arena.id}
                  className="rounded-2xl border border-white/15 bg-white/[0.03] p-5 hover:border-[#d5a7ff]/50 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center font-mono text-xs">
                      <span className="text-[#d5a7ff] font-bold">Arena #{arena.arenaId}</span>
                      <span className="rounded-full border border-[#4ce47d]/40 bg-[#4ce47d]/10 px-2.5 py-0.5 text-[#4ce47d]">
                        {arena.status}
                      </span>
                    </div>
                    <div className="mt-4">
                      <p className="font-mono text-[10px] text-[#8e8892]">ENTRY BET</p>
                      <p className="text-2xl font-black text-white">{arena.betAmount} USDm</p>
                    </div>
                  </div>
                  <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between">
                    <span className="flex items-center gap-1 font-mono text-xs text-[#a79cae]">
                      <Users size={14} /> {arena.currentPlayers}/{arena.maxPlayers}
                    </span>
                    <Link
                      href={`/arena/${arena.arenaId}`}
                      className="rounded-xl bg-white/10 hover:bg-[#d5a7ff] px-4 py-2 font-mono text-xs font-bold text-white hover:text-black transition"
                    >
                      JOIN →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        {/* Leaderboard Preview & Provably Fair Info */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <motion.div className="md:col-span-6 space-y-4" variants={itemVariants}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Award className="text-yellow-400" /> Leaderboard Top Ranks
              </h2>
              <Link href="/leaderboard" className="font-mono text-xs text-[#4ce47d] hover:underline">
                FULL LEADERBOARD →
              </Link>
            </div>
            <div className="space-y-2">
              {leaderboard.length === 0 ? (
                <div className="rounded-2xl border border-white/10 p-6 text-center text-xs text-[#8e8892]">
                  No player records yet. Start playing to rank up!
                </div>
              ) : (
                leaderboard.slice(0, 4).map((p) => (
                  <div
                    key={p.address}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 font-mono text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[#d5a7ff]">#{p.position}</span>
                      <span className="text-white">
                        {p.username || `${p.address.slice(0, 6)}...${p.address.slice(-4)}`}
                      </span>
                    </div>
                    <span className="text-[#4ce47d] font-bold">
                      {p.totalWonUsdm.toFixed(2)} USDm
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          <motion.div
            className="md:col-span-6 rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 flex flex-col justify-between"
            variants={itemVariants}
          >
            <div>
              <div className="flex items-center gap-2 font-mono text-xs text-[#4ce47d]">
                <ShieldCheck size={18} /> PROVABLY FAIR ARCHITECTURE
              </div>
              <h3 className="mt-3 text-2xl font-bold text-white">Cryptographically Auditable</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#dad0df]">
                Every card pick and round result is derived directly from Witnet Oracle VRF randomness on Celo.
                Server seeds are committed on-chain prior to player selection.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="font-mono text-[10px] text-[#8e8892]">VERIFY ANY ROUND ID</span>
              <Link
                href="/verify"
                className="rounded-xl border border-[#4ce47d]/40 bg-[#4ce47d]/10 px-4 py-2 font-mono text-xs font-bold text-[#4ce47d] hover:bg-[#4ce47d] hover:text-black transition"
              >
                VERIFY NOW →
              </Link>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────
// Root Page — Session-aware bifurcation
// ─────────────────────────────────────────────────────────

export default function Home() {
  const { data: session, status } = useSession();

  // While session is loading, show nothing (prevents flash)
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#08070a] flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="font-mono text-xs text-[#d5a7ff]"
        >
          ⬡ LOADING...
        </motion.div>
      </div>
    );
  }

  // Authenticated → show dashboard
  if (session?.user) {
    return <AuthenticatedDashboard />;
  }

  // Anonymous → show public landing page
  return <PublicLandingPage />;
}

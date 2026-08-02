"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Gamepad2, ShieldCheck, Trophy, Zap, Award, UserPlus, Wallet, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";

const faqItems = [
  {
    q: "Is my wallet used to log in?",
    a: "No. XOLAT uses email + password (or Google) for your account. Wallets are only linked after you're signed in, purely to receive USDm payouts.",
  },
  {
    q: "What currency do I play with?",
    a: "USDm only, on the Celo network. All pots, bets and payouts are denominated in USDm.",
  },
  {
    q: "How is fairness guaranteed?",
    a: "Every round's randomness is generated on-chain via Witnet VRF and can be independently verified on the Verify Fairness page.",
  },
  {
    q: "Can I unlink or change my wallet?",
    a: "Yes. Manage linked wallets anytime from Settings → Linked Wallets, including setting a primary wallet or unlinking one.",
  },
];

const steps = [
  {
    icon: UserPlus,
    title: "1. Create an account",
    body: "Sign up with email + password (or Google) and verify your email with a one-time code.",
  },
  {
    icon: Wallet,
    title: "2. Link your wallet",
    body: "After signing in, connect and sign with your wallet once to receive USDm payouts. No wallet required to browse or sign up.",
  },
  {
    icon: Sparkles,
    title: "3. Predict & win",
    body: "Join an Arena or play Solo, get matched against provably-fair randomness, and get paid instantly in USDm.",
  },
];

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

export default function Home() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  return (
    <AppShell>
      {/* Hero Section */}
      <motion.section
        className="relative mx-auto flex min-h-[420px] max-w-6xl flex-col items-center justify-center px-5 pt-10 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_50%_20%,rgba(178,112,255,.18),transparent_43%)] pointer-events-none" />

        <motion.div className="relative flex items-center gap-2.5" variants={itemVariants}>
          <span className="grid h-9 w-9 place-items-center text-3xl text-[#d5a7ff]">⬡</span>
          <span className="text-4xl font-black italic tracking-[-0.09em] text-[#d6a8ff]">XOLAT</span>
        </motion.div>

        <motion.h1
          className="relative mt-6 max-w-lg text-4xl font-black leading-tight text-[#f6efff] sm:text-5xl"
          variants={itemVariants}
        >
          Predict. Compete. <span className="text-[#4ce47d]">Win USDm.</span>
        </motion.h1>

        <motion.p
          className="relative mt-5 max-w-md text-base leading-7 text-[#dfd5e6]"
          variants={itemVariants}
        >
          The provably-fair prediction arena. Battle other players or go solo,
          verified on-chain, paid instantly in USDm.
        </motion.p>

        <motion.div
          className="relative mt-10 flex w-full max-w-[340px] flex-col gap-3"
          variants={itemVariants}
        >
          {isAuthenticated ? (
            <Link
              href="/arena"
              className="rounded-2xl bg-[#4ce47d] px-6 py-4 text-lg font-black tracking-[.05em] text-black shadow-[0_0_28px_rgba(76,228,125,.25)] transition hover:scale-[1.02]"
            >
              ENTER ARENA
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="rounded-2xl bg-[#4ce47d] px-6 py-4 text-lg font-black tracking-[.05em] text-black shadow-[0_0_28px_rgba(76,228,125,.25)] transition hover:scale-[1.02]"
              >
                CREATE FREE ACCOUNT
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-white/15 bg-white/[.025] py-3.5 font-mono text-xs tracking-[.2em] text-[#e7dce9] transition hover:bg-white/[.07]"
              >
                SIGN IN
              </Link>
            </>
          )}
        </motion.div>
      </motion.section>

      {/* Feature Preview Cards */}
      <motion.section
        className="mx-auto max-w-6xl px-5 pb-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="grid grid-cols-1 gap-4 sm:grid-cols-3" variants={containerVariants}>
          {/* Arena preview */}
          <Link href="/arena">
            <motion.article
              className="h-full rounded-2xl border border-white/15 bg-white/[.025] p-5 transition"
              variants={itemVariants}
              whileHover={{ scale: 1.02, borderColor: "rgba(213,167,255,.3)" }}
            >
              <div className="flex items-center gap-2 text-[#d5a7ff]">
                <Gamepad2 size={22} />
                <span className="font-mono text-[10px] tracking-[.15em]">MULTIPLAYER</span>
              </div>
              <h3 className="mt-4 text-lg font-bold">Arena</h3>
              <p className="mt-2 text-sm leading-5 text-[#dad0df]">
                Battle 2-4 players for the highest USDm pot, settled by Witnet VRF.
              </p>
            </motion.article>
          </Link>

          {/* Solo preview */}
          <Link href="/solo">
            <motion.article
              className="h-full rounded-2xl border border-white/15 bg-gradient-to-br from-[#1e1823] to-white/[.02] p-5 transition"
              variants={itemVariants}
              whileHover={{ scale: 1.02, borderColor: "rgba(76,226,124,.3)" }}
            >
              <div className="flex items-center gap-2 text-[#4ce47d]">
                <Trophy size={22} />
                <span className="font-mono text-[10px] tracking-[.15em]">SINGLE PLAYER</span>
              </div>
              <h3 className="mt-4 text-lg font-bold">Solo</h3>
              <p className="mt-2 text-sm leading-5 text-[#dad0df]">
                Instant-play prediction rounds against the house, paid out immediately.
              </p>
            </motion.article>
          </Link>

          {/* Leaderboard preview */}
          <Link href="/leaderboard">
            <motion.article
              className="h-full rounded-2xl border border-white/15 bg-white/[.025] p-5 transition"
              variants={itemVariants}
              whileHover={{ scale: 1.02, borderColor: "rgba(213,167,255,.3)" }}
            >
              <div className="flex items-center gap-2 text-yellow-400">
                <Award size={22} />
                <span className="font-mono text-[10px] tracking-[.15em]">SEASON 01</span>
              </div>
              <h3 className="mt-4 text-lg font-bold">Leaderboard</h3>
              <p className="mt-2 text-sm leading-5 text-[#dad0df]">
                Climb the global rankings and earn seasonal rewards.
              </p>
            </motion.article>
          </Link>
        </motion.div>

        {/* Trust strip */}
        <motion.div
          className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
          variants={containerVariants}
        >
          <motion.article
            className="rounded-2xl border border-white/15 bg-white/[.025] p-5"
            variants={itemVariants}
          >
            <div className="flex items-center gap-2 text-[#d5a7ff]">
              <ShieldCheck size={20} />
              <h3 className="text-base font-bold text-white">Provably Fair</h3>
            </div>
            <p className="mt-2 text-sm leading-5 text-[#dad0df]">
              Every round&apos;s randomness is cryptographically verifiable on-chain.
            </p>
            <Link href="/verify" className="mt-3 inline-block font-mono text-[10px] tracking-[.12em] text-[#4ce47d] hover:text-[#6ef494]">
              ◉ VERIFY FAIRNESS
            </Link>
          </motion.article>

          <motion.article
            className="rounded-2xl border border-white/15 bg-white/[.025] p-5"
            variants={itemVariants}
          >
            <div className="flex items-center gap-2 text-[#4ce47d]">
              <Zap size={20} />
              <h3 className="text-base font-bold text-white">Instant Payouts</h3>
            </div>
            <p className="mt-2 text-sm leading-5 text-[#dad0df]">
              No withdrawals. Winnings are sent directly to your linked wallet.
            </p>
          </motion.article>
        </motion.div>
      </motion.section>

      {/* How It Works */}
      <motion.section
        id="how-it-works"
        className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-14"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <motion.h2 className="text-center text-2xl font-bold text-white" variants={itemVariants}>
          How It Works
        </motion.h2>
        <motion.div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3" variants={containerVariants}>
          {steps.map(({ icon: Icon, title, body }) => (
            <motion.div
              key={title}
              className="rounded-2xl border border-white/15 bg-white/[.025] p-5"
              variants={itemVariants}
            >
              <Icon size={22} className="text-[#d5a7ff]" />
              <h3 className="mt-3 text-base font-bold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-5 text-[#dad0df]">{body}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* Statistics */}
      <motion.section
        className="mx-auto max-w-6xl px-5 pb-14"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <motion.div className="grid grid-cols-1 gap-4 sm:grid-cols-3" variants={containerVariants}>
          <motion.div className="rounded-2xl border border-white/15 bg-white/[.025] p-6 text-center" variants={itemVariants}>
            <div className="text-3xl font-black text-[#d5a7ff]">2</div>
            <p className="mt-1 font-mono text-[10px] tracking-[.15em] text-[#a79cae]">GAME MODES</p>
          </motion.div>
          <motion.div className="rounded-2xl border border-white/15 bg-white/[.025] p-6 text-center" variants={itemVariants}>
            <div className="text-3xl font-black text-[#4ce47d]">100%</div>
            <p className="mt-1 font-mono text-[10px] tracking-[.15em] text-[#a79cae]">PROVABLY FAIR</p>
          </motion.div>
          <motion.div className="rounded-2xl border border-white/15 bg-white/[.025] p-6 text-center" variants={itemVariants}>
            <div className="text-3xl font-black text-yellow-400">USDm</div>
            <p className="mt-1 font-mono text-[10px] tracking-[.15em] text-[#a79cae]">ON CELO NETWORK</p>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* FAQ */}
      <motion.section
        id="faq"
        className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-16"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <motion.h2 className="text-center text-2xl font-bold text-white" variants={itemVariants}>
          Frequently Asked Questions
        </motion.h2>
        <motion.div className="mt-8 space-y-3" variants={containerVariants}>
          {faqItems.map(({ q, a }) => (
            <motion.div
              key={q}
              className="rounded-2xl border border-white/15 bg-white/[.025] p-5"
              variants={itemVariants}
            >
              <h3 className="text-sm font-bold text-white">{q}</h3>
              <p className="mt-2 text-sm leading-5 text-[#dad0df]">{a}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>
    </AppShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAccount } from "wagmi";
import { Gamepad2, Trophy, ArrowRight, ShieldCheck, Sparkles, Flame, Users, Award } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { LiveFeed } from "@/components/live-feed";
import { DailyFreePlay } from "@/components/daily-free-play";
import { useUsdmBalance } from "@/lib/hooks/useUsdmBalance";

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
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

export default function Home() {
  const { isConnected, address } = useAccount();
  const { balance } = useUsdmBalance();

  const [openArenas, setOpenArenas] = useState<OpenArena[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPlayer[]>([]);
  const [isLoadingArenas, setIsLoadingArenas] = useState(true);

  // Fetch live active arenas and top players
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingArenas(true);
      try {
        const [arenasRes, rankRes] = await Promise.all([
          fetch("/api/arenas?limit=3&status=OPEN").catch(() => null),
          fetch("/api/leaderboard?limit=5").catch(() => null),
        ]);

        if (arenasRes && arenasRes.ok) {
          const json = await arenasRes.json();
          setOpenArenas(json.data?.arenas || []);
        }

        if (rankRes && rankRes.ok) {
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

              {/* Action Buttons */}
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

            {/* Right Widget: Wallet Overview & Balance */}
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

        {/* Live Activity & Daily Reward Section Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Live Activity Feed */}
          <motion.div className="md:col-span-7" variants={itemVariants}>
            <div className="flex items-center justify-between pb-3">
              <h2 className="flex items-center gap-2 font-mono text-xs font-bold tracking-widest text-[#ded4e2] uppercase">
                <Flame className="text-[#4ce47d]" size={16} /> LIVE PLATFORM ACTIVITY
              </h2>
            </div>
            <LiveFeed />
          </motion.div>

          {/* Daily Free Play Spin */}
          <motion.div className="md:col-span-5" variants={itemVariants}>
            <div className="flex items-center justify-between pb-3">
              <h2 className="flex items-center gap-2 font-mono text-xs font-bold tracking-widest text-[#ded4e2] uppercase">
                <Sparkles className="text-[#d5a7ff]" size={16} /> DAILY FREE REWARD
              </h2>
            </div>
            <DailyFreePlay />
          </motion.div>
        </div>

        {/* Active Open Arenas Preview */}
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

        {/* Leaderboard Preview & Provably Fair Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Leaderboard Top Players */}
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

          {/* Provably Fair Guarantee Card */}
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
                Every card pick and round result is derived directly from Witnet Oracle VRF randomness on Celo. Server seeds are committed on-chain prior to player selection.
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


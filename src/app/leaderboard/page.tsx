"use client";

import { motion } from "framer-motion";
import { AppShell } from "@/components/app-shell";
import { LoadingState, EmptyState } from "@/components/state-displays";
import { useEffect, useState } from "react";

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

interface LeaderboardEntry {
  position: number;
  address: string;
  username: string | null;
  totalWonUsdm: number;
  rank: string;
  totalPlayed: number;
}

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/leaderboard?type=overall&limit=100");
        if (!res.ok) throw new Error("Failed to fetch leaderboard");
        
        const json = await res.json();
        setPlayers(json.data.leaderboard);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <AppShell title="Leaderboard">
        <section className="mx-auto max-w-2xl px-5 pt-7">
          <LoadingState />
        </section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Leaderboard">
        <section className="mx-auto max-w-2xl px-5 pt-7">
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
            <p className="text-sm text-red-300">{error}</p>
          </div>
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
          {players.map((player) => (
            <motion.article
              key={player.address}
              className="flex items-center gap-5 rounded-2xl border border-white/15 bg-white/[.025] p-5 hover:bg-white/[.04] transition"
              variants={itemVariants}
              whileHover={{ x: 4 }}
            >
              <b className="text-2xl text-[#d5a7ff] w-12 text-center">
                {String(player.position).padStart(2, "0")}
              </b>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#d5a7ff]/15">
                ◉
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">
                  {player.username || player.address.slice(0, 6) + "..." + player.address.slice(-4)}
                </p>
                <p className="text-xs text-[#8d739c]">{player.rank}</p>
              </div>
              <span className="font-mono text-[#4ce47d] text-right">
                {player.totalWonUsdm.toFixed(2)} USDm
              </span>
            </motion.article>
          ))}
        </motion.div>
      </section>
    </AppShell>
  );
}

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { AppShell } from "@/components/app-shell";
import { LoadingState, EmptyState, ErrorState } from "@/components/state-displays";
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

const rowVariants = {
  hidden: { opacity: 0, y: 5 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
};

interface DbRound {
  id: string;
  roundId: string | number;
  type: string;
  potUsdm: string | number | null;
  winnerAddress: string | null;
  status: string;
  createdAt: string;
}

export default function HistoryPage() {
  const { data: session } = useSession();
  const [rounds, setRounds] = useState<DbRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/rounds");
        if (!res.ok) {
          throw new Error(`Failed to load history (status ${res.status})`);
        }
        const json = await res.json();
        setRounds(json.data || []);
      } catch (err) {
        console.error("Failed to fetch history:", err);
        setError(err instanceof Error ? err.message : "Failed to load history");
      } finally {
        setLoading(false);
      }
    };

    void fetchHistory();
  }, [session?.user?.id]);

  if (loading) {
    return (
      <AppShell title="Round History">
        <section className="mx-auto max-w-3xl px-5 pt-7">
          <LoadingState />
        </section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Round History">
        <section className="mx-auto max-w-3xl px-5 pt-7">
          <ErrorState message={error} />
        </section>
      </AppShell>
    );
  }

  if (rounds.length === 0) {
    return (
      <AppShell title="Round History">
        <section className="mx-auto max-w-3xl px-5 pt-7">
          <EmptyState message="No rounds yet. Play to start!" />
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell title="Round History">
      <section className="mx-auto max-w-3xl px-5 pt-7">
        <motion.div
          className="overflow-hidden rounded-2xl border border-white/15"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid grid-cols-4 bg-white/[.06] p-4 font-mono text-xs tracking-[.12em] text-[#d8cadd]">
            <span>ROUND</span>
            <span>MODE</span>
            <span>RESULT</span>
            <span>VERIFY</span>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {rounds.map((round) => (
              <motion.div
                key={round.id}
                className="grid grid-cols-4 items-center border-t border-white/10 p-4 text-sm hover:bg-white/[.02] transition"
                variants={rowVariants}
              >
                <span className="font-mono text-[#d5a7ff]">#{round.roundId?.toString() || round.id.slice(0, 6)}</span>
                <span className="uppercase font-mono text-xs">{round.type}</span>
                <span
                  className={
                    round.status === "settled" || round.status === "REVEALED" ? "text-[#4ce47d]" : "text-yellow-300"
                  }
                >
                  {round.potUsdm ? `${round.potUsdm} USDm` : round.status}
                </span>
                <Link
                  className="font-mono text-xs text-[#d5a7ff] underline hover:text-white transition"
                  href={`/verify?round=${round.id}`}
                >
                  VERIFY →
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>
    </AppShell>
  );
}

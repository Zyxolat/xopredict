"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
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

const rowVariants = {
  hidden: { opacity: 0, y: 5 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
};

interface Round {
  id: string;
  type: "Arena" | "Solo";
  result: string;
  status: "Won" | "Lost";
}

export default function HistoryPage() {
  const { data: session } = useSession();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchHistory = async () => {
      try {
        // TODO: Replace with real API call to /api/players/[playerId]/history
        const mockRounds: Round[] = [
          { id: "842", type: "Arena", result: "+42.75", status: "Won" },
          { id: "841", type: "Solo", result: "-10.00", status: "Lost" },
          { id: "840", type: "Arena", result: "+18.50", status: "Won" },
        ];
        setRounds(mockRounds);
      } catch (error) {
        console.error("Failed to fetch history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
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
                <span>#{round.id}</span>
                <span>{round.type}</span>
                <span
                  className={
                    round.status === "Won" ? "text-[#4ce47d]" : "text-red-300"
                  }
                >
                  {round.result} USDm
                </span>
                <Link
                  className="font-mono text-xs text-[#d5a7ff] hover:text-[#e7dce9] transition"
                  href={`/verify?round=${round.id}`}
                >
                  OPEN
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>
    </AppShell>
  );
}

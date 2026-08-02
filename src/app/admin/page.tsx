"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { parseUnits } from "viem";
import { AppShell } from "@/components/app-shell";
import { ErrorState } from "@/components/state-displays";
import { useAdminActions } from "@/lib/hooks/useAdminActions";
import { xolatAddress } from "@/lib/contracts";

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
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

interface AdminStats {
  playerCount: number;
  totalBets: number;
  bannedCount: number;
  activeArenas: number;
}

function statusMessage(activeCall: string | null, status: string): string | null {
  if (!activeCall || status === "idle") return null;
  const label =
    activeCall === "pause" ? "Pause" :
    activeCall === "unpause" ? "Unpause" :
    activeCall === "refund" ? "Refund" :
    "Set bet limits";
  if (status === "pending_wallet") return `${label}: confirm the transaction in your wallet...`;
  if (status === "confirming") return `${label}: waiting for on-chain confirmation...`;
  if (status === "success") return `${label}: confirmed on-chain.`;
  if (status === "rejected") return `${label}: transaction rejected in wallet.`;
  if (status === "error") return `${label}: transaction failed (check that your wallet is the contract owner).`;
  return null;
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const { isConnected } = useAccount();

  const [arenaIdInput, setArenaIdInput] = useState("");
  const [maxBetPerTxInput, setMaxBetPerTxInput] = useState("20");
  const [maxBetPerDayInput, setMaxBetPerDayInput] = useState("100");

  const { pauseContract, unpauseContract, refundArena, setBetLimits, activeCall, status, error } =
    useAdminActions();

  useEffect(() => {
    const fetchAdminStats = async () => {
      setLoading(true);
      setStatsError(null);
      try {
        const res = await fetch("/api/admin");
        if (!res.ok) {
          throw new Error(`Failed to load admin stats (status ${res.status})`);
        }
        const json = await res.json();
        setStats(json.data);
      } catch (err) {
        console.error("Admin stats fetch error:", err);
        setStatsError(err instanceof Error ? err.message : "Failed to load admin stats");
      } finally {
        setLoading(false);
      }
    };

    void fetchAdminStats();
  }, []);

  const msg = statusMessage(activeCall, status);
  const isBusy = status === "pending_wallet" || status === "confirming";

  return (
    <AppShell title="Admin Console">
      <section className="mx-auto max-w-2xl px-5 pt-7 pb-20 space-y-6">
        <motion.p
          className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          Owner-only protocol controls. These call the deployed contract directly — the
          connected wallet must be the contract owner or the transaction will revert.
        </motion.p>

        {!xolatAddress && (
          <div className="rounded-xl border border-red-400/40 bg-red-400/10 p-3 font-mono text-xs text-red-300">
            NEXT_PUBLIC_XOLAT_CONTRACT_ADDRESS is not configured — on-chain actions are disabled.
          </div>
        )}

        {!isConnected && (
          <div className="rounded-xl border border-yellow-400/40 bg-yellow-400/10 p-3 font-mono text-xs text-yellow-200">
            Connect the contract owner&apos;s wallet to use the controls below.
          </div>
        )}

        {statsError && !loading && <ErrorState message={statsError} />}

        {msg && (
          <div
            className={`rounded-xl border p-3 font-mono text-xs ${
              status === "error" || status === "rejected"
                ? "border-red-400/40 bg-red-400/10 text-red-300"
                : "border-[#4ce47d]/40 bg-[#4ce47d]/10 text-[#4ce47d]"
            }`}
          >
            {msg}
            {error && status === "error" && (
              <p className="mt-1 text-[10px] text-red-300/80 break-all">{error.message}</p>
            )}
          </div>
        )}

        <motion.div
          className="grid grid-cols-2 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {[
            ["TOTAL PLAYERS", loading ? "..." : String(stats?.playerCount || 0)],
            ["TOTAL ROUNDS PLAYED", loading ? "..." : String(stats?.totalBets || 0)],
            ["OPEN ARENAS", loading ? "..." : String(stats?.activeArenas || 0)],
            ["BANNED PLAYERS", loading ? "..." : String(stats?.bannedCount || 0)],
          ].map(([label, value]) => (
            <motion.div
              key={label}
              className="rounded-2xl border border-white/15 bg-white/[.025] p-5 hover:bg-white/[.04] transition"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
            >
              <p className="font-mono text-[10px] tracking-[.12em] text-[#d8cadd]">
                {label}
              </p>
              <b className="mt-3 block text-xl text-[#d5a7ff]">{value}</b>
            </motion.div>
          ))}
        </motion.div>

        {/* Emergency pause / unpause */}
        <motion.div className="grid grid-cols-2 gap-3" variants={containerVariants} initial="hidden" animate="visible">
          <motion.button
            onClick={pauseContract}
            disabled={!isConnected || !xolatAddress || isBusy}
            className="rounded-xl border border-red-400/50 py-4 font-mono text-sm text-red-300 hover:opacity-80 transition disabled:opacity-40"
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            EMERGENCY PAUSE
          </motion.button>
          <motion.button
            onClick={unpauseContract}
            disabled={!isConnected || !xolatAddress || isBusy}
            className="rounded-xl border border-white/20 py-4 font-mono text-sm text-white hover:opacity-80 transition disabled:opacity-40"
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            UNPAUSE
          </motion.button>
        </motion.div>

        {/* Refund timed-out arena */}
        <motion.div
          className="rounded-2xl border border-white/15 bg-white/[.025] p-5 space-y-3"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <p className="font-mono text-xs tracking-[.1em] text-[#d8cadd]">REFUND TIMED-OUT ARENA</p>
          <div className="flex gap-3">
            <input
              type="number"
              min="0"
              value={arenaIdInput}
              onChange={(e) => setArenaIdInput(e.target.value)}
              placeholder="Arena ID"
              className="flex-1 rounded-xl border border-white/15 bg-black/40 px-4 py-3 font-mono text-sm text-white placeholder-[#6e6878] focus:border-[#d5a7ff] focus:outline-none"
            />
            <button
              onClick={() => arenaIdInput && refundArena(BigInt(arenaIdInput))}
              disabled={!isConnected || !xolatAddress || isBusy || !arenaIdInput}
              className="rounded-xl border border-white/20 px-5 py-3 font-mono text-xs font-bold text-white hover:bg-white/10 transition disabled:opacity-40"
            >
              REFUND
            </button>
          </div>
        </motion.div>

        {/* Set protocol bet limits */}
        <motion.div
          className="rounded-2xl border border-white/15 bg-white/[.025] p-5 space-y-3"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <p className="font-mono text-xs tracking-[.1em] text-[#d8cadd]">SET PROTOCOL BET LIMITS (USDm)</p>
          <div className="flex gap-3">
            <input
              type="number"
              min="0"
              step="0.01"
              value={maxBetPerTxInput}
              onChange={(e) => setMaxBetPerTxInput(e.target.value)}
              placeholder="Max per tx"
              className="flex-1 rounded-xl border border-white/15 bg-black/40 px-4 py-3 font-mono text-sm text-white placeholder-[#6e6878] focus:border-[#d5a7ff] focus:outline-none"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={maxBetPerDayInput}
              onChange={(e) => setMaxBetPerDayInput(e.target.value)}
              placeholder="Max per day"
              className="flex-1 rounded-xl border border-white/15 bg-black/40 px-4 py-3 font-mono text-sm text-white placeholder-[#6e6878] focus:border-[#d5a7ff] focus:outline-none"
            />
          </div>
          <button
            onClick={() =>
              setBetLimits(parseUnits(maxBetPerTxInput || "0", 18), parseUnits(maxBetPerDayInput || "0", 18))
            }
            disabled={!isConnected || !xolatAddress || isBusy || !maxBetPerTxInput || !maxBetPerDayInput}
            className="w-full rounded-xl border border-white/20 py-3 font-mono text-xs font-bold text-white hover:bg-white/10 transition disabled:opacity-40"
          >
            APPLY LIMITS
          </button>
        </motion.div>
      </section>
    </AppShell>
  );
}


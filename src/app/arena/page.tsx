"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";
import { AppShell } from "@/components/app-shell";
import { NetworkGuard } from "@/components/network-guard";
import { UsdmApprovalGate } from "@/components/usdm-approval-gate";
import { useCreateArena } from "@/lib/hooks/useCreateArena";
import { useJoinArena } from "@/lib/hooks/useJoinArena";
import { Gamepad2, PlusCircle, RefreshCw, Users, ShieldAlert, Sparkles, Trophy } from "lucide-react";

interface ArenaItem {
  id: string;
  arenaId: string;
  creatorAddress: string;
  betAmount: string;
  maxPlayers: number;
  currentPlayers: number;
  status: string;
  players: string[];
  isPrivate: boolean;
  inviteCode?: string;
  createdAt: string;
}

export default function ArenaDiscoveryPage() {
  const { address, isConnected } = useAccount();
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [page, setPage] = useState<number>(1);
  const [arenas, setArenas] = useState<ArenaItem[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State for Create Arena
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [betAmount, setBetAmount] = useState<string>("10");
  const [maxPlayers, setMaxPlayers] = useState<number>(2);

  const {
    createArena,
    status: createStatus,
    arenaId: newArenaId,
    errorMessage: createErrorMessage,
    reset: resetCreate,
  } = useCreateArena();

  const {
    joinArena,
    status: joinStatus,
    errorMessage: joinErrorMessage,
  } = useJoinArena();

  // Fetch Public Arenas with filters & pagination
  const fetchArenas = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const statusParam = filterStatus !== "ALL" ? `&status=${filterStatus}` : "";
      const res = await fetch(`/api/arenas?page=${page}&limit=9${statusParam}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch arenas");
      const json = await res.json();
      if (json.data) {
        setArenas(json.data.arenas || []);
        setTotalPages(json.data.pagination?.totalPages || 1);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load arenas");
    } finally {
      setIsLoading(false);
    }
  }, [page, filterStatus]);

  useEffect(() => {
    void fetchArenas();
  }, [fetchArenas]);

  // Navigate to newly created arena upon success
  useEffect(() => {
    if (createStatus === "success" && newArenaId !== null) {
      setIsCreateOpen(false);
      window.location.href = `/arena/${newArenaId.toString()}`;
    }
  }, [createStatus, newArenaId]);

  const handleCreateSubmit = () => {
    try {
      const betWei = parseUnits(betAmount, 18);
      createArena(betWei, maxPlayers);
    } catch (err) {
      console.error("Invalid bet amount format:", err);
    }
  };

  const betAmountWei = parseUnits(betAmount || "1", 18);

  return (
    <AppShell title="Arena Lobby">
      <section className="mx-auto max-w-6xl px-5 pt-6 pb-20">
        {/* Header Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#1b1528] via-[#0d0a14] to-black p-8 shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(213,167,255,0.15),transparent_50%)]" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-[#d5a7ff]">
                <Gamepad2 size={16} /> MULTIPLAYER ARENA DISCOVERY
              </div>
              <h1 className="mt-2 text-4xl md:text-5xl font-black tracking-tight text-white">
                BATTLE FOR THE <span className="text-[#d5a7ff]">USDm POT</span>
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#dad0df]">
                Join high-stakes 2 to 4 player card battle arenas. High score takes 95% of the total pot, verified provably fair by Witnet VRF.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchArenas()}
                className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3 font-mono text-xs tracking-wider text-[#dfd5e6] hover:bg-white/10 transition"
              >
                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> REFRESH
              </button>
              <button
                onClick={() => {
                  resetCreate();
                  setIsCreateOpen(true);
                }}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#d5a7ff] to-[#4ce47d] px-6 py-3.5 font-bold text-black shadow-lg shadow-[#d5a7ff]/20 hover:scale-[1.02] transition active:scale-[0.98]"
              >
                <PlusCircle size={18} /> CREATE ARENA
              </button>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex flex-wrap gap-2 font-mono text-xs">
            {["ALL", "OPEN", "FULL", "PICKING"].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setFilterStatus(status);
                  setPage(1);
                }}
                className={`rounded-full px-5 py-2 transition ${
                  filterStatus === status
                    ? "bg-[#d5a7ff] font-bold text-black shadow-md"
                    : "border border-white/10 bg-white/[0.03] text-[#d8cadd] hover:bg-white/[0.08]"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <div className="font-mono text-xs text-[#a79cae]">
            Page {page} of {totalPages}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            <ShieldAlert size={20} /> {error}
          </div>
        )}

        {/* Arena Grid List */}
        {isLoading ? (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-3xl border border-white/10 bg-white/[0.02]"
              />
            ))}
          </div>
        ) : arenas.length === 0 ? (
          <div className="mt-16 rounded-3xl border border-white/10 bg-white/[0.02] p-12 text-center">
            <Trophy size={48} className="mx-auto text-[#d5a7ff]/40" />
            <h3 className="mt-4 text-xl font-bold text-white">No Arenas Found</h3>
            <p className="mt-2 text-sm text-[#ded4e2]">
              Be the first to create a public arena for others to join!
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#d5a7ff] px-6 py-3 font-bold text-black"
            >
              <PlusCircle size={16} /> Create Arena Now
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {arenas.map((arena) => {
              const isJoined =
                address &&
                arena.players.some((p) => p.toLowerCase() === address.toLowerCase());
              const isOpen = arena.status === "OPEN";

              return (
                <motion.article
                  key={arena.id}
                  whileHover={{ y: -4, borderColor: "rgba(213,167,255,0.4)" }}
                  className="flex flex-col justify-between rounded-3xl border border-white/15 bg-white/[0.03] p-6 backdrop-blur-md shadow-xl transition"
                >
                  <div>
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-[#d5a7ff]">
                        Arena #{arena.arenaId}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 font-bold ${
                          arena.status === "OPEN"
                            ? "border border-[#4ce47d]/40 bg-[#4ce47d]/10 text-[#4ce47d]"
                            : arena.status === "FULL" || arena.status === "PICKING"
                            ? "border border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
                            : "border border-white/20 bg-white/10 text-white/70"
                        }`}
                      >
                        {arena.status}
                      </span>
                    </div>

                    <div className="mt-6 text-center">
                      <p className="font-mono text-xs tracking-widest text-[#a79cae]">
                        BET AMOUNT
                      </p>
                      <p className="mt-1 text-3xl font-black text-[#d5a7ff]">
                        {arena.betAmount} USDm
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-xs">
                      <span className="flex items-center gap-1.5 text-[#ded4e2]">
                        <Users size={14} /> PLAYERS
                      </span>
                      <span className="font-bold text-white">
                        {arena.currentPlayers} / {arena.maxPlayers}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10">
                    <Link
                      href={`/arena/${arena.arenaId}`}
                      className="block w-full text-center rounded-2xl bg-white/10 hover:bg-[#d5a7ff] py-3.5 font-bold text-white hover:text-black transition"
                    >
                      {isJoined ? "ENTER ARENA →" : isOpen ? "VIEW & JOIN →" : "SPECTATE →"}
                    </Link>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-12 flex justify-center gap-3 font-mono text-xs">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-white/15 px-4 py-2 disabled:opacity-30 hover:bg-white/10 transition"
            >
              PREVIOUS
            </button>
            <span className="flex items-center px-4 text-[#d5a7ff]">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-xl border border-white/15 px-4 py-2 disabled:opacity-30 hover:bg-white/10 transition"
            >
              NEXT
            </button>
          </div>
        )}
      </section>

      {/* Create Arena Modal */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-3xl border border-white/20 bg-[#120f1a] p-6 shadow-2xl"
            >
              <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
                <Sparkles className="text-[#d5a7ff]" /> Create New Arena
              </h2>
              <p className="mt-1 text-xs text-[#a79cae]">
                Set your USDm bet and maximum player count.
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="font-mono text-xs text-[#ded4e2]">BET AMOUNT (USDm)</label>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    min="1"
                    max="100"
                    className="mt-1 w-full rounded-2xl border border-white/15 bg-black/50 px-4 py-3 font-mono text-lg text-white focus:border-[#d5a7ff] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-mono text-xs text-[#ded4e2]">MAX PLAYERS (2-4)</label>
                  <div className="mt-2 grid grid-cols-3 gap-2 font-mono">
                    {[2, 3, 4].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setMaxPlayers(count)}
                        className={`rounded-xl py-2.5 font-bold transition ${
                          maxPlayers === count
                            ? "bg-[#d5a7ff] text-black shadow-md"
                            : "border border-white/15 bg-white/[0.04] text-white hover:bg-white/10"
                        }`}
                      >
                        {count} Players
                      </button>
                    ))}
                  </div>
                </div>

                {createErrorMessage && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 font-mono text-xs text-red-300">
                    {createErrorMessage}
                  </div>
                )}
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="w-1/2 rounded-2xl border border-white/15 py-3.5 font-mono text-xs text-white hover:bg-white/10 transition"
                >
                  CANCEL
                </button>

                <div className="w-1/2">
                  <NetworkGuard>
                    <UsdmApprovalGate betAmountWei={betAmountWei}>
                      <button
                        type="button"
                        onClick={handleCreateSubmit}
                        disabled={createStatus === "pending_wallet" || createStatus === "confirming"}
                        className="w-full rounded-2xl bg-[#4ce47d] py-3.5 font-bold text-black shadow-lg shadow-[#4ce47d]/20 hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-40"
                      >
                        {createStatus === "pending_wallet"
                          ? "APPROVE IN WALLET..."
                          : createStatus === "confirming"
                          ? "CONFIRMING..."
                          : "CONFIRM & CREATE"}
                      </button>
                    </UsdmApprovalGate>
                  </NetworkGuard>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}

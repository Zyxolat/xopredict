"use client";

import { useState } from "react";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card3D } from "@/components/card-3d";
import { NetworkGuard } from "@/components/network-guard";
import { UsdmApprovalGate } from "@/components/usdm-approval-gate";
import { useArena } from "@/lib/hooks/useArena";
import { useArenaStatus } from "@/lib/hooks/useArenaStatus";
import { useArenaPolling } from "@/lib/hooks/useArenaPolling";
import { useJoinArena } from "@/lib/hooks/useJoinArena";
import { usePickArenaCard } from "@/lib/hooks/usePickArenaCard";
import { Trophy, Users, ShieldAlert, Sparkles, ArrowLeft, RefreshCw, Clock } from "lucide-react";

export default function ArenaPage({ params }: { params: { id: string } }) {
  const { address } = useAccount();
  const arenaIdInput = params.id;

  // Hooks setup
  const { arena, isLoading, isError, error, refetch } = useArena(arenaIdInput);
  const statusInfo = useArenaStatus(arena);
  const { statusData, isPolling, refetchNow } = useArenaPolling(arenaIdInput, 3000);

  const {
    joinArena,
    status: joinStatus,
    errorMessage: joinErrorMessage,
  } = useJoinArena();

  const {
    pickArenaCard,
    status: pickStatus,
    errorMessage: pickErrorMessage,
  } = usePickArenaCard();

  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);

  // Compute player relationship
  const playerLower = address ? address.toLowerCase() : "";
  const currentPlayersList = statusData?.arena?.players || arena?.players || [];
  const isPlayerJoined = currentPlayersList.some(
    (p) => p.toLowerCase() === playerLower
  );

  const betAmountWei = arena?.betAmount
    ? parseUnits(arena.betAmount, 18)
    : parseUnits("10", 18);

  const handleJoin = () => {
    if (!arena?.arenaId) return;
    joinArena(arena.arenaId);
  };

  const handlePickCard = (cardIndex: number) => {
    if (!arena?.arenaId || !isPlayerJoined) return;
    setSelectedCardIndex(cardIndex);
    pickArenaCard(arena.arenaId, cardIndex);
  };

  const currentStatus = statusData?.status || arena?.status || "OPEN";
  const winner = statusData?.arena?.winner || arena?.winner;

  return (
    <AppShell title={`Arena #${params.id}`}>
      <section className="mx-auto max-w-4xl px-5 pt-6 pb-20">
        {/* Navigation Top Bar */}
        <div className="flex items-center justify-between pb-6">
          <Link
            href="/arena"
            className="flex items-center gap-2 font-mono text-xs text-[#d5a7ff] hover:text-white transition"
          >
            <ArrowLeft size={16} /> BACK TO ARENA LOBBY
          </Link>
          <button
            onClick={() => {
              void refetch();
              void refetchNow();
            }}
            className="flex items-center gap-2 font-mono text-xs text-[#dfd5e6] border border-white/15 bg-white/[0.04] px-3.5 py-1.5 rounded-full hover:bg-white/10 transition"
          >
            <RefreshCw size={12} className={isPolling ? "animate-spin" : ""} />
            {isPolling ? "LIVE SYNC (3s)" : "SYNC"}
          </button>
        </div>

        {/* Error Banners */}
        {(isError || error || joinErrorMessage || pickErrorMessage) && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            <ShieldAlert size={20} />
            <span>
              {joinErrorMessage ||
                pickErrorMessage ||
                (error ? (error as Error).message : "Arena loading error")}
            </span>
          </div>
        )}

        {/* Status bar */}
        <div className="flex items-center justify-between font-mono">
          <span
            className={`rounded-full border px-4 py-1.5 text-xs font-bold ${
              statusInfo.isOpen
                ? "border-[#4ce47d] text-[#4ce47d] bg-[#4ce47d]/10"
                : statusInfo.isPickingPhase
                ? "border-yellow-400 text-yellow-300 bg-yellow-400/10"
                : statusInfo.isWaitingForKeeper
                ? "border-purple-400 text-purple-300 bg-purple-400/10"
                : statusInfo.isSettled
                ? "border-emerald-400 text-emerald-300 bg-emerald-400/10"
                : "border-white/20 text-white/70 bg-white/5"
            }`}
          >
            ● {currentStatus} PHASE
          </span>

          <span className="flex items-center gap-1.5 text-[#d5a7ff] font-mono text-sm">
            <Clock size={16} />
            {statusInfo.isOpen ? "WAITING FOR PLAYERS" : statusInfo.isPickingPhase ? "PICK CARD NOW" : "RESERVED"}
          </span>
        </div>

        {/* Pot display */}
        <div className="mt-8 rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-8 text-center shadow-2xl">
          <p className="font-mono text-xs tracking-widest text-[#d8cadd]">
            TOTAL ARENA POT
          </p>
          <p className="mt-3 text-5xl font-black tracking-tight text-[#d5a7ff]">
            {arena
              ? (
                  Number(arena.betAmount) * (arena.currentPlayers || 1)
                ).toLocaleString()
              : "0"}{" "}
            USDm
          </p>
          <p className="mx-auto mt-4 w-fit rounded-full border border-white/15 bg-black/40 px-5 py-2 font-mono text-xs font-bold text-white flex items-center gap-2">
            <Users size={14} className="text-[#d5a7ff]" />
            {arena ? arena.currentPlayers : 0} / {arena ? arena.maxPlayers : 2} PLAYERS
          </p>
        </div>

        {/* Competitors List */}
        <div className="mt-8">
          <h2 className="font-mono text-xs tracking-widest text-[#ded4e2] uppercase">
            ACTIVE COMPETITORS ({currentPlayersList.length})
          </h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {currentPlayersList.map((playerAddr, idx) => {
              const isSelf = playerAddr.toLowerCase() === playerLower;
              return (
                <span
                  key={playerAddr}
                  className={`rounded-2xl border px-4 py-2.5 font-mono text-xs flex items-center gap-2 transition ${
                    isSelf
                      ? "border-[#4ce47d] bg-[#4ce47d]/10 text-[#4ce47d] font-bold"
                      : "border-white/15 bg-white/[0.04] text-white"
                  }`}
                >
                  ◉ {playerAddr.slice(0, 6)}...{playerAddr.slice(-4)}
                  {isSelf && " (YOU)"}
                  {idx === 0 && " 👑 HOST"}
                </span>
              );
            })}
          </div>
        </div>

        {/* Waiting Lobby View for Unfilled Arena */}
        {statusInfo.isOpen && !isPlayerJoined && (
          <div className="mt-8 pb-10">
            <NetworkGuard>
              <UsdmApprovalGate betAmountWei={betAmountWei}>
                <button
                  id="join-arena-btn"
                  onClick={handleJoin}
                  disabled={
                    joinStatus === "pending_wallet" ||
                    joinStatus === "confirming" ||
                    joinStatus === "syncing_db"
                  }
                  className="w-full rounded-2xl bg-gradient-to-r from-[#d5a7ff] to-[#4ce47d] py-4 text-xl font-black text-black shadow-xl shadow-[#d5a7ff]/20 hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-40"
                >
                  {joinStatus === "pending_wallet"
                    ? "CONFIRM JOIN IN WALLET..."
                    : joinStatus === "confirming"
                    ? "CONFIRMING JOIN TRANSACTION..."
                    : joinStatus === "syncing_db"
                    ? "SYNCHRONIZING..."
                    : "JOIN THIS ARENA"}
                </button>
              </UsdmApprovalGate>
            </NetworkGuard>
          </div>
        )}

        {/* Card Grid Selection (4 Cards: index 0, 1, 2, 3) */}
        <div className="mt-10">
          <div className="flex justify-between items-center pb-3">
            <h2 className="font-mono text-xs tracking-widest text-[#ded4e2] uppercase">
              SELECT YOUR CARD (0 - 3)
            </h2>
            {isPlayerJoined && (
              <span className="font-mono text-xs text-[#4ce47d]">
                ✓ YOU ARE JOINED
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((cardIndex) => {
              const isSelected = selectedCardIndex === cardIndex;
              const canPick =
                isPlayerJoined &&
                (statusInfo.isPickingPhase || statusInfo.isFull || statusInfo.isOpen) &&
                !statusInfo.isSettled;

              return (
                <Card3D
                  key={cardIndex}
                  label={`CARD ${cardIndex + 1}`}
                  selected={isSelected}
                  revealed={statusInfo.isSettled}
                  onClick={() => canPick && handlePickCard(cardIndex)}
                />
              );
            })}
          </div>

          {pickStatus === "pending_wallet" && (
            <p className="mt-4 font-mono text-xs text-center text-yellow-300">
              Confirm card selection transaction in your connected wallet...
            </p>
          )}
        </div>

        {/* Keeper Processing Banner */}
        {statusInfo.isWaitingForKeeper && (
          <div className="mt-8 rounded-3xl border border-purple-500/30 bg-purple-500/10 p-6 text-center">
            <Sparkles className="mx-auto text-purple-300 animate-spin" size={32} />
            <h3 className="mt-3 text-lg font-bold text-white">
              Relayer Keeper Processing
            </h3>
            <p className="mt-1 font-mono text-xs text-purple-200">
              Requesting and revealing Witnet VRF randomness on-chain...
            </p>
          </div>
        )}

        {/* Result Screen / Winner Announcement */}
        {statusInfo.isSettled && (
          <div className="mt-8 rounded-3xl border border-[#4ce47d]/40 bg-gradient-to-br from-[#4ce47d]/10 via-black to-black p-8 text-center shadow-2xl">
            <Trophy size={56} className="mx-auto text-yellow-400 animate-bounce" />
            <h2 className="mt-4 text-3xl font-black text-white">
              ARENA SETTLED!
            </h2>
            <p className="mt-2 font-mono text-sm text-[#d5a7ff]">
              WINNER: {winner ? `${winner.slice(0, 6)}...${winner.slice(-4)}` : "PROTOCOL OWNER"}
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <Link
                href="/arena"
                className="rounded-2xl bg-[#4ce47d] px-6 py-3.5 font-bold text-black hover:scale-105 transition"
              >
                PLAY AGAIN IN LOBBY →
              </Link>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}

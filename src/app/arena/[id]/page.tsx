"use client";

import { parseUnits } from "viem";
import { AppShell } from "@/components/app-shell";
import { Card3D } from "@/components/card-3d";
import { NetworkGuard } from "@/components/network-guard";
import { UsdmApprovalGate } from "@/components/usdm-approval-gate";

/**
 * Phase 2 placeholder bet amount.
 * Phase 3 will replace this with the actual on-chain arena.betAmount read
 * via useReadContract(xolatAbi, "getArena", [arenaId]).
 */
const ARENA_BET_AMOUNT_WEI = parseUnits("1", 18); // 1 USDm

export default function ArenaPage({ params }: { params: { id: string } }) {
  return (
    <AppShell title={`Arena #${params.id}`}>
      <section className="mx-auto max-w-3xl px-5 pt-8">

        {/* ── Status bar ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between font-mono">
          <span className="rounded-full border border-[#a77cca] px-3 py-1 text-xs text-[#d5a7ff]">
            LIVE • PICK PHASE
          </span>
          <span className="text-3xl font-bold text-[#d5a7ff]">10s</span>
        </div>

        {/* ── Timer bar ─────────────────────────────────────────────────── */}
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-2/3 bg-gradient-to-r from-[#d5a7ff] to-[#4ce47d]" />
        </div>

        {/* ── Pot display ───────────────────────────────────────────────── */}
        <div className="mt-10 rounded-3xl border border-white/15 bg-white/[.025] p-8 text-center">
          <p className="font-mono text-sm tracking-[.24em] text-[#d8cadd]">
            TOTAL ARENA POT
          </p>
          <p className="mt-5 text-5xl font-bold text-[#d5a7ff]">2,450 USDm</p>
          <p className="mx-auto mt-6 w-fit rounded-full border border-white/15 px-5 py-2 font-mono">
            ♟ 4 / 6 PLAYERS
          </p>
        </div>

        {/* ── Card grid ─────────────────────────────────────────────────── */}
        <div className="mt-10 grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, index) => (
            <Card3D key={index} label={`CARD ${index + 1}`} />
          ))}
        </div>

        {/* ── Competitors ───────────────────────────────────────────────── */}
        <h2 className="mt-10 font-mono text-sm tracking-[.2em]">
          ACTIVE COMPETITORS
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {["0xAres", "Void_Runner", "Holo_G", "Ether0x"].map((name) => (
            <span
              key={name}
              className="rounded-full border border-white/15 bg-white/[.04] px-4 py-3 font-mono"
            >
              ◉ {name}
            </span>
          ))}
        </div>

        {/* ── Join action — gated behind network + approval checks ──────── */}
        <div className="mt-10 pb-10">
          <NetworkGuard>
            <UsdmApprovalGate betAmountWei={ARENA_BET_AMOUNT_WEI}>
              {/*
               * Phase 2: button shown once USDm is approved but gameplay
               * is disabled (Phase 3 wires the actual joinArena() call).
               */}
              <button
                id="join-arena-btn"
                disabled
                className="w-full rounded-2xl bg-[#4ce47d] py-4 text-xl font-black text-black opacity-40 cursor-not-allowed"
                title="Gameplay coming in Phase 3"
              >
                JOIN ARENA
              </button>
            </UsdmApprovalGate>
          </NetworkGuard>
        </div>

      </section>
    </AppShell>
  );
}

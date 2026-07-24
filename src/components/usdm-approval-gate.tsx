"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { formatUnits } from "viem";
import { useUsdmBalance } from "@/lib/hooks/useUsdmBalance";
import { useUsdmAllowance } from "@/lib/hooks/useUsdmAllowance";
import { useUsdmApprove } from "@/lib/hooks/useUsdmApprove";
import { EmptyState, LoadingState } from "@/components/state-displays";

// ── Types ──────────────────────────────────────────────────────────────────────

interface UsdmApprovalGateProps {
  /**
   * The amount (in wei, 18 decimals) the Xolat contract needs approval to
   * spend.  Pass 0n when the user has not yet entered a bet — children are
   * rendered immediately so the Play button appears (in its disabled state)
   * while the user is still filling in the form.
   */
  betAmountWei: bigint;
  /** The Play / Join button — rendered only when allowance is sufficient. */
  children: React.ReactNode;
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Shared USDm approval gate used by both Solo Mode and Arena Mode.
 *
 * Render decision tree:
 *  1. No wallet             → "Connect your wallet" prompt
 *  2. Data loading          → spinner
 *  3. Zero USDm balance     → "No balance" warning + free-play link
 *  4. betAmountWei === 0n   → children (no bet entered yet; Play btn disabled)
 *  5. allowance sufficient  → children (Play / Join button enabled)
 *  6. approve() completed   → children (optimistic — allowance refetch follows)
 *  7. allowance insufficient→ Approve button with full state-machine feedback
 */
export function UsdmApprovalGate({ betAmountWei, children }: UsdmApprovalGateProps) {
  const {
    balanceBigInt,
    isLoading: balanceLoading,
    isConnected,
  } = useUsdmBalance();

  const {
    allowance,
    isLoading: allowanceLoading,
    refetch: refetchAllowance,
  } = useUsdmAllowance();

  const { approve, status, txHash, errorMessage, reset } = useUsdmApprove();

  // Immediately re-read allowance once the approval tx is confirmed so the
  // gate transitions to showing children without waiting for the next poll.
  useEffect(() => {
    if (status === "done") {
      void refetchAllowance();
    }
  }, [status, refetchAllowance]);

  // ── Guard 1: no wallet ──────────────────────────────────────────────────────
  if (!isConnected) {
    return <EmptyState message="Connect your wallet to play." />;
  }

  // ── Guard 2: loading ────────────────────────────────────────────────────────
  if (balanceLoading || allowanceLoading) {
    return <LoadingState />;
  }

  // ── Guard 3: zero balance ───────────────────────────────────────────────────
  if (!balanceBigInt || balanceBigInt === 0n) {
    return (
      <motion.div
        className="rounded-2xl border border-amber-400/20 bg-amber-400/[.06] p-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <p className="text-2xl">⚠️</p>
        <p className="mt-3 font-mono text-sm tracking-[.14em] text-amber-300">
          NO USDm BALANCE
        </p>
        <p className="mt-2 text-sm text-[#d8cadd]">
          You need USDm to play. Claim your daily free play to get started.
        </p>
        <a
          href="/"
          className="mt-4 inline-block rounded-xl border border-[#4ce47d]/30 bg-[#4ce47d]/10 px-6 py-2.5 font-mono text-xs tracking-[.14em] text-[#4ce47d] transition hover:bg-[#4ce47d]/20"
        >
          GET FREE PLAY →
        </a>
      </motion.div>
    );
  }

  // ── Guard 4 & 5 & 6: no bet entered / allowance sufficient / just approved ──
  const isSufficient = betAmountWei === 0n || allowance >= betAmountWei;
  const isApproveComplete = status === "done";

  if (isSufficient || isApproveComplete) {
    return <>{children}</>;
  }

  // ── Approval UI ─────────────────────────────────────────────────────────────
  const isSubmitting = status === "pending" || status === "confirming";

  return (
    <motion.div
      className="space-y-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* ── Rejection / error banner ──────────────────────────────────────── */}
      {(status === "rejected" || status === "error") && (
        <motion.div
          className="rounded-xl border border-red-400/30 bg-red-400/[.08] px-4 py-3"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <p className="font-mono text-xs tracking-[.14em] text-red-400">
            {status === "rejected"
              ? "⊗  TRANSACTION REJECTED"
              : "⊗  TRANSACTION FAILED"}
          </p>
          {errorMessage && (
            <p className="mt-1 text-xs text-red-300/80">{errorMessage}</p>
          )}
        </motion.div>
      )}

      {/* ── CeloScan tx link while waiting for confirmation ───────────────── */}
      {status === "confirming" && txHash && (
        <motion.div
          className="rounded-xl border border-[#d5a7ff]/20 bg-[#d5a7ff]/[.05] px-4 py-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="font-mono text-[10px] tracking-[.12em] text-[#d5a7ff]/70">
            TX ON-CHAIN:{" "}
            <a
              href={`https://celoscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline transition hover:text-[#d5a7ff]"
            >
              {txHash.slice(0, 12)}…{txHash.slice(-6)}
            </a>
          </p>
        </motion.div>
      )}

      {/* ── Approve button ────────────────────────────────────────────────── */}
      <motion.button
        id="approve-usdm-btn"
        onClick={() => {
          // Reset error state before retrying so the hook transitions cleanly
          if (status === "rejected" || status === "error") reset();
          approve();
        }}
        disabled={isSubmitting}
        className="w-full rounded-2xl border border-[#d5a7ff]/40 bg-[#d5a7ff]/[.08] py-4 font-mono text-sm tracking-[.18em] text-[#d5a7ff] transition hover:bg-[#d5a7ff]/20 disabled:cursor-not-allowed disabled:opacity-50"
        whileHover={!isSubmitting ? { scale: 1.02 } : undefined}
        whileTap={!isSubmitting ? { scale: 0.97 } : undefined}
      >
        <span className="flex items-center justify-center gap-3">
          {/* Spinner shown during pending & confirming */}
          {isSubmitting && (
            <motion.span
              className="block h-4 w-4 rounded-full border-2 border-[#d5a7ff]/25 border-t-[#d5a7ff]"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
            />
          )}

          {status === "idle" || status === "rejected" || status === "error"
            ? "APPROVE USDm"
            : status === "pending"
            ? "WAITING FOR WALLET…"
            : "CONFIRMING ON-CHAIN…"}
        </span>
      </motion.button>

      {/* ── Allowance vs required — tiny informational line ───────────────── */}
      <p className="text-center font-mono text-[10px] tracking-[.1em] text-[#d8cadd]/40">
        ALLOWANCE {parseFloat(formatUnits(allowance, 18)).toFixed(2)} USDm
        {betAmountWei > 0n && (
          <>
            {" "}/ REQUIRED {parseFloat(formatUnits(betAmountWei, 18)).toFixed(2)} USDm
          </>
        )}
      </p>
    </motion.div>
  );
}

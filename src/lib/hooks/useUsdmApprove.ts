"use client";

import { useCallback } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { maxUint256 } from "viem";
import { usdmAbi, usdmAddress, xolatAddress } from "@/lib/contracts";

// ── Types ──────────────────────────────────────────────────────────────────────

/**
 * Lifecycle stages of an ERC-20 approve() call.
 *
 *  idle ──▶ pending (wallet prompt open)
 *               ├──▶ confirming (tx in mempool, awaiting 1 block)
 *               │         └──▶ done
 *               ├──▶ rejected (user dismissed the wallet prompt)
 *               └──▶ error    (tx reverted or network failure)
 */
export type ApproveStatus =
  | "idle"
  | "pending"
  | "confirming"
  | "done"
  | "rejected"
  | "error";

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Heuristic rejection detection across MetaMask, WalletConnect, and viem. */
function isUserRejection(error: Error | null | undefined): boolean {
  if (!error) return false;
  const name = error.name ?? "";
  const msg = error.message?.toLowerCase() ?? "";
  return (
    name === "UserRejectedRequestError" ||
    // cause chain (wagmi wraps viem errors)
    (error as { cause?: { name?: string } }).cause?.name === "UserRejectedRequestError" ||
    msg.includes("user rejected") ||
    msg.includes("user denied") ||
    msg.includes("rejected the request")
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * Manages the full approve(xolatAddress, MaxUint256) lifecycle with a
 * typed status derived from wagmi's write + receipt hooks.
 *
 * Using MaxUint256 means the user approves once per wallet — standard UX
 * for DeFi applications.  The approval is revocable at any time.
 */
export function useUsdmApprove() {
  // Step 1: submit the transaction to the wallet
  const {
    writeContract,
    data: txHash,
    isPending,
    isError: isWriteError,
    error: writeError,
    reset,
  } = useWriteContract();

  // Step 2: wait for 1 on-chain confirmation
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    isError: isReceiptError,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
    query: { enabled: !!txHash },
  });

  // ── Trigger ────────────────────────────────────────────────────────────────
  const approve = useCallback(() => {
    if (!usdmAddress || !xolatAddress) {
      console.warn("[useUsdmApprove] Contract addresses not configured.");
      return;
    }
    writeContract({
      address: usdmAddress,
      abi: usdmAbi,
      functionName: "approve",
      args: [xolatAddress, maxUint256],
    });
  }, [writeContract]);

  // ── Status derivation ──────────────────────────────────────────────────────
  let status: ApproveStatus = "idle";

  if (isPending) {
    status = "pending";
  } else if (txHash && isConfirming) {
    status = "confirming";
  } else if (isConfirmed) {
    status = "done";
  } else if (isWriteError) {
    status = isUserRejection(writeError) ? "rejected" : "error";
  } else if (isReceiptError) {
    status = "error";
  }

  // Prefer the viem shortMessage (e.g. "User rejected the request.") over the
  // raw internal message which can be hundreds of characters long.
  const activeError = writeError ?? receiptError;
  const errorMessage: string | null = activeError
    ? ((activeError as { shortMessage?: string }).shortMessage ??
        activeError.message ??
        null)
    : null;

  return {
    /** Initiate the approve() transaction. Safe to call in rejected/error state. */
    approve,
    /** Current lifecycle stage. */
    status,
    /** On-chain hash once the wallet has signed (available before confirmation). */
    txHash,
    /** Human-readable error, or null when no error. */
    errorMessage,
    /**
     * Reset write state.  Call this before retrying after rejected or error so
     * the hook transitions cleanly back to idle.
     */
    reset,
  };
}

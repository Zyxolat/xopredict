"use client";

import { useCallback, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { xolatAbi, xolatAddress } from "@/lib/contracts";

export type AdminActionStatus =
  | "idle"
  | "pending_wallet"
  | "confirming"
  | "success"
  | "rejected"
  | "error";

function isUserRejection(error: Error | null | undefined): boolean {
  if (!error) return false;
  const name = error.name ?? "";
  const msg = error.message?.toLowerCase() ?? "";
  return (
    name === "UserRejectedRequestError" ||
    (error as { cause?: { name?: string } }).cause?.name === "UserRejectedRequestError" ||
    msg.includes("user rejected") ||
    msg.includes("user denied") ||
    msg.includes("rejected the request")
  );
}

/**
 * Owner-only on-chain protocol controls (pause/unpause, refund unfilled arena,
 * set bet limits). Security boundary is enforced on-chain by the contract's
 * `onlyOwner` modifier — if the connected wallet isn't the contract owner,
 * the transaction reverts and is surfaced as an error here.
 */
export function useAdminActions() {
  const [activeCall, setActiveCall] = useState<string | null>(null);

  const {
    writeContract,
    data: txHash,
    isPending: isPendingWallet,
    isError: isWriteError,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

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

  const call = useCallback(
    (label: string, functionName: "pause" | "unpause" | "refundUnfilledArena" | "setMaxBet", args: readonly unknown[]) => {
      if (!xolatAddress) {
        console.warn("[useAdminActions] Contract address not configured.");
        return;
      }
      setActiveCall(label);
      writeContract({
        address: xolatAddress,
        abi: xolatAbi,
        functionName,
        args,
      } as Parameters<typeof writeContract>[0]);
    },
    [writeContract]
  );

  const pauseContract = useCallback(() => call("pause", "pause", []), [call]);
  const unpauseContract = useCallback(() => call("unpause", "unpause", []), [call]);
  const refundArena = useCallback(
    (arenaId: bigint) => call("refund", "refundUnfilledArena", [arenaId]),
    [call]
  );
  const setBetLimits = useCallback(
    (perTxWei: bigint, perDayWei: bigint) => call("setMaxBet", "setMaxBet", [perTxWei, perDayWei]),
    [call]
  );

  const reset = useCallback(() => {
    resetWrite();
    setActiveCall(null);
  }, [resetWrite]);

  let status: AdminActionStatus = "idle";
  if (isPendingWallet) {
    status = "pending_wallet";
  } else if (txHash && isConfirming) {
    status = "confirming";
  } else if (isConfirmed) {
    status = "success";
  } else if (isWriteError) {
    status = isUserRejection(writeError) ? "rejected" : "error";
  } else if (isReceiptError) {
    status = "error";
  }

  return {
    pauseContract,
    unpauseContract,
    refundArena,
    setBetLimits,
    activeCall,
    status,
    txHash,
    error: writeError ?? receiptError,
    reset,
  };
}

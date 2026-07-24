"use client";

import { useCallback, useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { xolatAbi, xolatAddress } from "@/lib/contracts";

export type JoinArenaStatus =
  | "idle"
  | "pending_wallet"
  | "confirming"
  | "syncing_db"
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

export function useJoinArena() {
  const { address } = useAccount();
  const [activeArenaId, setActiveArenaId] = useState<bigint | null>(null);
  const [isSyncingDb, setIsSyncingDb] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

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
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
    query: { enabled: !!txHash },
  });

  const joinArena = useCallback(
    (arenaId: bigint) => {
      if (!xolatAddress) {
        console.warn("[useJoinArena] Contract address not configured.");
        return;
      }
      setActiveArenaId(arenaId);
      setSyncError(null);
      writeContract({
        address: xolatAddress,
        abi: xolatAbi,
        functionName: "joinArena",
        args: [arenaId],
      });
    },
    [writeContract]
  );

  // Synchronize join with DB on confirmation
  useEffect(() => {
    if (!isConfirmed || !receipt || !address || activeArenaId === null) return;

    setIsSyncingDb(true);
    fetch("/api/arenas/join", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        arenaId: activeArenaId.toString(),
        playerAddress: address,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error && !data.error.includes("already joined")) {
          console.warn("[useJoinArena] DB sync warning:", data.error);
        }
      })
      .catch((err) => {
        console.error("[useJoinArena] DB sync error:", err);
        setSyncError(err.message || "Join DB sync failed");
      })
      .finally(() => {
        setIsSyncingDb(false);
      });
  }, [isConfirmed, receipt, address, activeArenaId]);

  const reset = useCallback(() => {
    resetWrite();
    setActiveArenaId(null);
    setIsSyncingDb(false);
    setSyncError(null);
  }, [resetWrite]);

  let status: JoinArenaStatus = "idle";
  if (isPendingWallet) {
    status = "pending_wallet";
  } else if (txHash && isConfirming) {
    status = "confirming";
  } else if (isSyncingDb) {
    status = "syncing_db";
  } else if (isConfirmed) {
    status = "success";
  } else if (isWriteError) {
    status = isUserRejection(writeError) ? "rejected" : "error";
  } else if (isReceiptError || syncError) {
    status = "error";
  }

  const activeError = writeError ?? receiptError;
  const errorMessage: string | null = syncError
    ? syncError
    : activeError
    ? ((activeError as { shortMessage?: string }).shortMessage ?? activeError.message ?? null)
    : null;

  return {
    joinArena,
    status,
    txHash,
    receipt,
    errorMessage,
    reset,
  };
}

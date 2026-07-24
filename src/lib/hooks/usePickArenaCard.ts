"use client";

import { useCallback, useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { xolatAbi, xolatAddress } from "@/lib/contracts";

export type PickArenaCardStatus =
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

export function usePickArenaCard() {
  const { address } = useAccount();
  const [activeSelection, setActiveSelection] = useState<{
    arenaId: bigint;
    cardIndex: number;
  } | null>(null);
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

  const pickArenaCard = useCallback(
    (arenaId: bigint, cardIndex: number) => {
      if (!xolatAddress) {
        console.warn("[usePickArenaCard] Contract address not configured.");
        return;
      }
      setActiveSelection({ arenaId, cardIndex });
      setSyncError(null);
      writeContract({
        address: xolatAddress,
        abi: xolatAbi,
        functionName: "pickCard",
        args: [arenaId, cardIndex],
      });
    },
    [writeContract]
  );

  // Sync pick to backend DB
  useEffect(() => {
    if (!isConfirmed || !receipt || !address || !activeSelection) return;

    setIsSyncingDb(true);
    fetch("/api/arenas/pick", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        arenaId: activeSelection.arenaId.toString(),
        playerAddress: address,
        cardIndex: activeSelection.cardIndex,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          console.warn("[usePickArenaCard] DB pick sync warning:", data.error);
        }
      })
      .catch((err) => {
        console.error("[usePickArenaCard] DB pick sync error:", err);
        setSyncError(err.message || "Card pick DB sync failed");
      })
      .finally(() => {
        setIsSyncingDb(false);
      });
  }, [isConfirmed, receipt, address, activeSelection]);

  const reset = useCallback(() => {
    resetWrite();
    setActiveSelection(null);
    setIsSyncingDb(false);
    setSyncError(null);
  }, [resetWrite]);

  let status: PickArenaCardStatus = "idle";
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
    pickArenaCard,
    status,
    txHash,
    receipt,
    errorMessage,
    reset,
  };
}

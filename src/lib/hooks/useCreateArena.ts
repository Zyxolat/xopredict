"use client";

import { useCallback, useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { parseEventLogs, formatUnits } from "viem";
import { xolatAbi, xolatAddress } from "@/lib/contracts";

export type CreateArenaStatus =
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

export function useCreateArena() {
  const { address } = useAccount();
  const [createdArenaId, setCreatedArenaId] = useState<bigint | null>(null);
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

  const createArena = useCallback(
    (betAmountWei: bigint, maxPlayers: number) => {
      if (!xolatAddress) {
        console.warn("[useCreateArena] Contract address not configured.");
        return;
      }
      setCreatedArenaId(null);
      setSyncError(null);
      writeContract({
        address: xolatAddress,
        abi: xolatAbi,
        functionName: "createArena",
        args: [betAmountWei, maxPlayers],
      });
    },
    [writeContract]
  );

  // When transaction is confirmed on-chain, parse logs & sync with database
  useEffect(() => {
    if (!isConfirmed || !receipt || !address) return;

    let arenaIdFromLogs: bigint | null = null;

    try {
      const logs = parseEventLogs({
        abi: xolatAbi,
        eventName: "ArenaCreated",
        logs: receipt.logs,
      });

      if (logs.length > 0) {
        const logArgs = (logs[0] as unknown as { args?: { arenaId?: bigint } })?.args;
        if (logArgs?.arenaId !== undefined) {
          arenaIdFromLogs = logArgs.arenaId;
          setCreatedArenaId(arenaIdFromLogs);
        }
      }
    } catch (err) {
      console.warn("[useCreateArena] Log parsing warning:", err);
    }

    if (arenaIdFromLogs !== null) {
      setIsSyncingDb(true);
      fetch("/api/arenas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          arenaId: arenaIdFromLogs.toString(),
          betAmount: formatUnits(10n ** 18n, 18), // standard format
          maxPlayers: 2,
          creatorAddress: address,
          transactionHash: receipt.transactionHash,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            console.warn("[useCreateArena] DB sync message:", data.error);
          }
        })
        .catch((err) => {
          console.error("[useCreateArena] DB sync error:", err);
          setSyncError(err.message || "Database sync failed");
        })
        .finally(() => {
          setIsSyncingDb(false);
        });
    }
  }, [isConfirmed, receipt, address]);

  const reset = useCallback(() => {
    resetWrite();
    setCreatedArenaId(null);
    setIsSyncingDb(false);
    setSyncError(null);
  }, [resetWrite]);

  let status: CreateArenaStatus = "idle";
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
    createArena,
    status,
    txHash,
    arenaId: createdArenaId,
    receipt,
    errorMessage,
    reset,
  };
}

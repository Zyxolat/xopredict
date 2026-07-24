"use client";

import { useCallback } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { xolatAbi, xolatAddress } from "@/lib/contracts";

export type PickSoloCardStatus =
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

export function usePickSoloCard() {
  const {
    writeContract,
    data: txHash,
    isPending: isPendingWallet,
    isError: isWriteError,
    error: writeError,
    reset,
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

  const pickSoloCard = useCallback(
    (gameId: bigint, cardIndex: number) => {
      if (!xolatAddress) {
        console.warn("[usePickSoloCard] Contract address not configured.");
        return;
      }
      writeContract({
        address: xolatAddress,
        abi: xolatAbi,
        functionName: "pickSoloCard",
        args: [gameId, cardIndex],
      });
    },
    [writeContract]
  );

  let status: PickSoloCardStatus = "idle";
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

  const activeError = writeError ?? receiptError;
  const errorMessage: string | null = activeError
    ? ((activeError as { shortMessage?: string }).shortMessage ??
        activeError.message ??
        null)
    : null;

  return {
    pickSoloCard,
    status,
    txHash,
    receipt,
    errorMessage,
    reset,
  };
}

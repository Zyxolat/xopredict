import { KeeperStage, KeeperJobStatus } from "@prisma/client";

export interface KeeperJobData {
  id: string;
  roundId: string;
  playerAddress: string;
  betAmount: string;
  cardIndex: number;
  stage: KeeperStage;
  status: KeeperJobStatus;
  requestBlock?: string | null;
  celoPaid?: string | null;
  requestTxHash?: string | null;
  fetchTxHash?: string | null;
  settleTxHash?: string | null;
  retryCount: number;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KeeperStatusResponse {
  ok: boolean;
  roundId: string;
  stage: KeeperStage;
  status: KeeperJobStatus;
  requestTxHash?: string | null;
  fetchTxHash?: string | null;
  settleTxHash?: string | null;
  message: string;
  updatedAt: string;
}

export function getStageDescription(stage: KeeperStage, status: KeeperJobStatus): string {
  if (status === "FAILED") return "Relayer processing failed. Retry or refund available.";
  if (status === "COMPLETED" || stage === "COMPLETED") return "Game completed & settled on-chain.";

  switch (stage) {
    case "REQUEST_RANDOMNESS":
      return "Submitting requestRandomness() to Witnet oracle...";
    case "AWAIT_WITNET":
      return "Waiting for Witnet oracle to finalize randomness block...";
    case "FETCH_RANDOMNESS":
      return "Fetching verified randomness from Witnet on-chain...";
    case "SETTLE_ROUND":
      return "Settling round & executing payouts...";
    case "REFUNDED":
      return "Round timed out & full USDm refund processed.";
    default:
      return "Processing game on-chain...";
  }
}

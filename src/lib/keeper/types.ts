import { KeeperStage, KeeperJobStatus } from "@prisma/client";

export type KeeperJobType = "SOLO" | "ARENA" | "solo" | "arena";

export interface KeeperJobData {
  id: string;
  roundId?: string | null;
  arenaId?: string | null;
  type: KeeperJobType;
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
  roundId?: string | null;
  arenaId?: string | null;
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
    case "WAIT_FOR_FULL_ARENA":
      return "Waiting for players to fill arena...";
    case "WAIT_FOR_ALL_CARD_PICKS":
      return "Waiting for all players to pick their cards...";
    case "REQUEST_RANDOMNESS":
      return "Submitting requestRandomness() to Witnet oracle...";
    case "AWAIT_WITNET":
      return "Waiting for Witnet oracle to finalize randomness block...";
    case "FETCH_RANDOMNESS":
      return "Fetching verified randomness from Witnet on-chain...";
    case "SETTLE_ROUND":
      return "Settling solo round & executing payout...";
    case "SETTLE_ARENA":
      return "Settling arena round & executing payouts...";
    case "SYNC_DATABASE":
      return "Synchronizing database records & stats...";
    case "REFUNDED":
      return "Round timed out & full USDm refund processed.";
    default:
      return "Processing game on-chain...";
  }
}

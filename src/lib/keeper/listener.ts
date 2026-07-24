import { prisma } from "@/lib/prisma";
import { processKeeperJob } from "@/lib/keeper/processor";

export interface RegisterSoloPlayedParams {
  roundId: bigint;
  playerAddress: string;
  betAmount: string;
  cardIndex: number;
}

export interface RegisterArenaParams {
  arenaId: bigint;
  creatorAddress: string;
  betAmount: string;
  maxPlayers: number;
}

/**
 * Register a SoloPlayed event into the keeper job queue idempotently
 * and trigger immediate background processing.
 */
export async function registerSoloPlayedEvent(params: RegisterSoloPlayedParams) {
  const { roundId, playerAddress, betAmount, cardIndex } = params;

  try {
    if (!prisma.keeperJob) return null;

    const job = await prisma.keeperJob.upsert({
      where: { roundId },
      update: {}, // If already exists, do not overwrite state
      create: {
        roundId,
        type: "SOLO",
        playerAddress,
        betAmount,
        cardIndex,
        stage: "REQUEST_RANDOMNESS",
        status: "PENDING",
      },
    });

    console.log(`[Keeper Listener] Idempotently registered Solo KeeperJob for round #${roundId.toString()}`);

    // Trigger async background processing (non-blocking)
    void processKeeperJob(roundId).catch((err) => {
      console.error(`[Keeper Listener] Background job execution error for round #${roundId.toString()}:`, err);
    });

    return job;
  } catch (error) {
    console.error(`[Keeper Listener] Failed to register KeeperJob for round #${roundId.toString()}:`, error);
    throw error;
  }
}

/**
 * Register an Arena creation/update event into the keeper job queue idempotently
 * and trigger immediate background processing.
 */
export async function registerArenaEvent(params: RegisterArenaParams) {
  const { arenaId, creatorAddress, betAmount } = params;

  try {
    if (!prisma.keeperJob) return null;

    const job = await prisma.keeperJob.upsert({
      where: { arenaId },
      update: {}, // If already exists, keep current state
      create: {
        arenaId,
        type: "ARENA",
        playerAddress: creatorAddress,
        betAmount,
        cardIndex: 0,
        stage: "WAIT_FOR_FULL_ARENA",
        status: "PENDING",
      },
    });

    console.log(`[Keeper Listener] Idempotently registered Arena KeeperJob for arena #${arenaId.toString()}`);

    // Trigger async background processing (non-blocking)
    void processKeeperJob(job.id).catch((err) => {
      console.error(`[Keeper Listener] Background arena job execution error for arena #${arenaId.toString()}:`, err);
    });

    return job;
  } catch (error) {
    console.error(`[Keeper Listener] Failed to register Arena KeeperJob for arena #${arenaId.toString()}:`, error);
    throw error;
  }
}

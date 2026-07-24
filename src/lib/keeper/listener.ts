import { prisma } from "@/lib/prisma";
import { processKeeperJob } from "@/lib/keeper/processor";

export interface RegisterSoloPlayedParams {
  roundId: bigint;
  playerAddress: string;
  betAmount: string;
  cardIndex: number;
}

/**
 * Register a SoloPlayed event into the keeper job queue idempotently
 * and trigger immediate background processing.
 */
export async function registerSoloPlayedEvent(params: RegisterSoloPlayedParams) {
  const { roundId, playerAddress, betAmount, cardIndex } = params;

  try {
    const job = await prisma.keeperJob.upsert({
      where: { roundId },
      update: {}, // If already exists, do not overwrite state
      create: {
        roundId,
        playerAddress,
        betAmount,
        cardIndex,
        stage: "REQUEST_RANDOMNESS",
        status: "PENDING",
      },
    });

    console.log(`[Keeper Listener] Idempotently registered KeeperJob for round #${roundId.toString()}`);

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

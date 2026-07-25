import { prisma } from "@/lib/prisma";
import { processKeeperJob } from "@/lib/keeper/processor";

export interface RegisterSoloPlayedParams {
  roundId: bigint;
  playerAddress: string;
  betAmount: string;
  cardIndex: number;
}

export interface RegisterArenaCreatedParams {
  arenaId: bigint;
  creatorAddress: string;
  betAmount: string;
  maxPlayers: number;
}

export type RegisterArenaParams = RegisterArenaCreatedParams;

export interface RegisterPlayerJoinedParams {
  arenaId: bigint;
  playerAddress: string;
}

export interface RegisterCardPickedParams {
  arenaId: bigint;
  playerAddress: string;
  cardIndex: number;
}

export interface RegisterRoundCreatedParams {
  roundId: bigint;
  roundType: "arena" | "solo" | string;
  arenaId?: bigint | null;
  playerAddress: string;
  potUsdm: string;
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
 * Handle ArenaCreated event
 */
export async function registerArenaCreatedEvent(params: RegisterArenaCreatedParams) {
  console.log(`[Keeper Listener] ArenaCreated event received for arena #${params.arenaId.toString()}`);
  return null;
}

/**
 * Handle PlayerJoined event
 */
export async function registerPlayerJoinedEvent(params: RegisterPlayerJoinedParams) {
  console.log(`[Keeper Listener] PlayerJoined event received for arena #${params.arenaId.toString()} by ${params.playerAddress}`);
  return null;
}

/**
 * Handle CardPicked event
 */
export async function registerCardPickedEvent(params: RegisterCardPickedParams) {
  console.log(`[Keeper Listener] CardPicked event received for arena #${params.arenaId.toString()} card ${params.cardIndex} by ${params.playerAddress}`);
  return null;
}

/**
 * Register an Arena RoundCreated event into the keeper job queue idempotently
 * ONLY when roundType == "arena". Triggers immediate background processing.
 */
export async function registerRoundCreatedEvent(params: RegisterRoundCreatedParams) {
  const { roundId, roundType, arenaId, playerAddress, potUsdm } = params;

  if (roundType.toLowerCase() !== "arena" || !arenaId) {
    if (roundType.toLowerCase() === "solo") {
      return registerSoloPlayedEvent({
        roundId,
        playerAddress,
        betAmount: potUsdm,
        cardIndex: 0,
      });
    }
    return null;
  }

  try {
    if (!prisma.keeperJob) return null;

    // Idempotent upsert by roundId or arenaId
    const existingJob = await prisma.keeperJob.findFirst({
      where: { OR: [{ roundId }, { arenaId }] },
    });

    let job;
    if (existingJob) {
      job = await prisma.keeperJob.update({
        where: { id: existingJob.id },
        data: {
          roundId,
          arenaId,
          type: "ARENA",
          stage: "REQUEST_RANDOMNESS",
          status: "PENDING",
        },
      });
    } else {
      job = await prisma.keeperJob.create({
        data: {
          roundId,
          arenaId,
          type: "ARENA",
          playerAddress,
          betAmount: potUsdm,
          cardIndex: 0,
          stage: "REQUEST_RANDOMNESS",
          status: "PENDING",
        },
      });
    }

    console.log(`[Keeper Listener] Idempotently registered Arena KeeperJob for arena #${arenaId.toString()} (round #${roundId.toString()})`);

    // Trigger async background processing (non-blocking)
    void processKeeperJob(job.id).catch((err) => {
      console.error(`[Keeper Listener] Background job execution error for arena #${arenaId.toString()}:`, err);
    });

    return job;
  } catch (error) {
    console.error(`[Keeper Listener] Failed to register KeeperJob for arena #${arenaId.toString()}:`, error);
    throw error;
  }
}

/**
 * Backward compatible helper for Arena registration
 */
export async function registerArenaEvent(params: RegisterArenaParams) {
  const { arenaId, creatorAddress, betAmount } = params;

  try {
    if (!prisma.keeperJob) return null;

    const existingJob = await prisma.keeperJob.findFirst({ where: { arenaId } });
    if (existingJob) {
      return existingJob;
    }

    const job = await prisma.keeperJob.create({
      data: {
        arenaId,
        type: "ARENA",
        playerAddress: creatorAddress,
        betAmount,
        cardIndex: 0,
        stage: "WAIT_FOR_FULL_ARENA",
        status: "PENDING",
      },
    });

    console.log(`[Keeper Listener] Registered Arena stub KeeperJob for arena #${arenaId.toString()}`);
    return job;
  } catch (error) {
    console.error(`[Keeper Listener] Failed to register Arena KeeperJob for arena #${arenaId.toString()}:`, error);
    throw error;
  }
}


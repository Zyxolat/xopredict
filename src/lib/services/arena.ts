import { prisma } from "@/lib/prisma";
import { DbArenaStatus } from "@prisma/client";
import { publicClient } from "@/lib/keeper/wallet";
import { xolatAbi, xolatAddress } from "@/lib/contracts";
import { registerArenaEvent } from "@/lib/keeper/listener";
import { processKeeperJob } from "@/lib/keeper/processor";
import { parseUnits } from "viem";

type OnChainArenaTuple = readonly [
  arenaId: bigint,
  betAmount: bigint,
  maxPlayers: number,
  playerCount: number,
  settled: boolean,
  winner: `0x${string}`,
  createdAt: bigint,
  players: readonly `0x${string}`[],
  status: number
];

export const ONCHAIN_STATUS_MAP: Record<number, DbArenaStatus> = {
  0: "OPEN",
  1: "FULL",
  2: "PICKING",
  3: "RANDOMNESS_REQUESTED",
  4: "REVEALED",
  5: "SETTLED",
  6: "REFUNDED",
  7: "EXPIRED",
};

export interface GetPublicArenasParams {
  page?: number;
  limit?: number;
  status?: DbArenaStatus;
}

export interface CreateArenaInput {
  arenaId: bigint;
  creatorAddress: string;
  betAmount: string;
  maxPlayers: number;
  isPrivate?: boolean;
  inviteCode?: string;
}

export interface JoinArenaInput {
  arenaId: bigint;
  playerAddress: string;
}

export interface PickArenaCardInput {
  arenaId: bigint;
  playerAddress: string;
  cardIndex: number;
}

/**
 * Service handling DB persistence, status validation, duplicate join prevention,
 * and on-chain synchronization for Arenas.
 */
export class ArenaService {
  /**
   * Get paginated public arenas with optional status filter
   */
  static async getPublicArenas(params: GetPublicArenasParams) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const skip = (page - 1) * limit;

    const whereClause: { isPrivate: boolean; status?: DbArenaStatus } = {
      isPrivate: false,
    };
    if (params.status) {
      whereClause.status = params.status;
    }

    const [total, arenas] = await Promise.all([
      prisma.arena.count({ where: whereClause }),
      prisma.arena.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      arenas,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Get all open joinable public arenas
   */
  static async getOpenArenas() {
    return prisma.arena.findMany({
      where: {
        isPrivate: false,
        status: "OPEN",
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

  /**
   * Get arena by on-chain arenaId or UUID or invite code
   */
  static async getArenaByIdentifier(identifier: string) {
    // Try numeric on-chain arenaId
    if (!isNaN(Number(identifier))) {
      const arena = await prisma.arena.findUnique({
        where: { arenaId: BigInt(identifier) },
      });
      if (arena) return arena;
    }

    // Try inviteCode
    const byInvite = await prisma.arena.findUnique({
      where: { inviteCode: identifier },
    });
    if (byInvite) return byInvite;

    // Try UUID id
    return prisma.arena.findUnique({
      where: { id: identifier },
    });
  }

  /**
   * Create an arena record in DB and register Keeper job.
   *
   * Verifies the arena actually exists on-chain with matching
   * creator/betAmount/maxPlayers before persisting, so a caller cannot
   * fabricate a phantom DB-only arena (which other players could then
   * "join" without any real funds ever being escrowed on-chain, and
   * which could later collide with a legitimately created on-chain arena
   * sharing the same arenaId).
   */
  static async createArena(input: CreateArenaInput) {
    const creatorLower = input.creatorAddress.toLowerCase();

    if (!xolatAddress) {
      throw new Error("Contract address not configured");
    }

    const [onChainArenaId, onChainBetAmount, onChainMaxPlayers, playerCount, , , , players] =
      (await publicClient.readContract({
        address: xolatAddress,
        abi: xolatAbi,
        functionName: "getArena",
        args: [input.arenaId],
      })) as unknown as OnChainArenaTuple;

    if (onChainArenaId === 0n || playerCount === 0) {
      throw new Error("Arena does not exist on-chain");
    }

    const onChainCreator = (players as readonly string[])[0]?.toLowerCase();
    if (onChainCreator !== creatorLower) {
      throw new Error("Creator address does not match on-chain arena creator");
    }

    const expectedBetAmountWei = parseUnits(input.betAmount, 18);
    if (onChainBetAmount !== expectedBetAmountWei) {
      throw new Error("Bet amount does not match on-chain arena");
    }

    if (Number(onChainMaxPlayers) !== input.maxPlayers) {
      throw new Error("Max players does not match on-chain arena");
    }

    const createdArena = await prisma.arena.create({
      data: {
        arenaId: input.arenaId,
        creatorAddress: creatorLower,
        betAmount: input.betAmount,
        maxPlayers: input.maxPlayers,
        currentPlayers: 1,
        status: "OPEN",
        players: [creatorLower],
        isPrivate: input.isPrivate || false,
        inviteCode: input.inviteCode || null,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      },
    });

    // Register Keeper job for automatic lifecycle tracking
    void registerArenaEvent({
      arenaId: input.arenaId,
      creatorAddress: creatorLower,
      betAmount: input.betAmount,
      maxPlayers: input.maxPlayers,
    }).catch((err) => {
      console.error(`[ArenaService] Error registering keeper job for arena #${input.arenaId.toString()}:`, err);
    });

    return createdArena;
  }

  /**
   * Join an existing arena in DB with strict duplicate check and status validation.
   *
   * Uses an optimistic-concurrency conditional update (compare-and-swap on
   * currentPlayers) to close a TOCTOU race: without it, two concurrent joins
   * could both read the same snapshot, both pass validation, and then the
   * second `update` would silently overwrite the first player's addition
   * (last-write-wins), losing a paid join or overselling the arena's max
   * player count.
   */
  static async joinArena(input: JoinArenaInput) {
    const playerLower = input.playerAddress.toLowerCase();

    for (let attempt = 0; attempt < 3; attempt++) {
      const arena = await prisma.arena.findUnique({
        where: { arenaId: input.arenaId },
      });

      if (!arena) {
        throw new Error("Arena not found");
      }

      // Validate ArenaStatus
      if (arena.status !== "OPEN") {
        throw new Error(`Cannot join arena in ${arena.status} status`);
      }

      // Prevent duplicate joins
      const alreadyJoined = arena.players.some(
        (p) => p.toLowerCase() === playerLower
      );
      if (alreadyJoined) {
        throw new Error("Player already joined this arena");
      }

      if (arena.currentPlayers >= arena.maxPlayers) {
        throw new Error("Arena is full");
      }

      const nextCount = arena.currentPlayers + 1;
      const isFull = nextCount >= arena.maxPlayers;
      const nextStatus: DbArenaStatus = isFull ? "FULL" : "OPEN";

      // Conditional (CAS) update: only succeeds if currentPlayers still
      // matches the snapshot we just validated against.
      const { count } = await prisma.arena.updateMany({
        where: {
          arenaId: input.arenaId,
          currentPlayers: arena.currentPlayers,
          status: "OPEN",
        },
        data: {
          currentPlayers: nextCount,
          players: [...arena.players, playerLower],
          status: nextStatus,
        },
      });

      if (count === 0) {
        // Lost the race — another join/update landed first. Retry with a
        // fresh read (the loop above will re-validate duplicate/full checks).
        continue;
      }

      const updatedArena = await prisma.arena.findUnique({
        where: { arenaId: input.arenaId },
      });

      // Ensure Keeper job is registered / triggered
      void registerArenaEvent({
        arenaId: input.arenaId,
        creatorAddress: arena.creatorAddress || playerLower,
        betAmount: arena.betAmount ? arena.betAmount.toString() : "10",
        maxPlayers: arena.maxPlayers || 2,
      }).catch(() => {});

      return updatedArena;
    }

    throw new Error("Failed to join arena due to concurrent updates, please retry");
  }

  /**
   * Record card pick for an arena player
   */
  static async pickArenaCard(input: PickArenaCardInput) {
    const playerLower = input.playerAddress.toLowerCase();
    const arena = await prisma.arena.findUnique({
      where: { arenaId: input.arenaId },
    });

    if (!arena) {
      throw new Error("Arena not found");
    }

    // Validate Status
    if (arena.status !== "FULL" && arena.status !== "PICKING" && arena.status !== "OPEN") {
      throw new Error(`Cannot pick card in ${arena.status} status`);
    }

    const isPlayerInArena = arena.players.some(
      (p) => p.toLowerCase() === playerLower
    );
    if (!isPlayerInArena) {
      throw new Error("Player is not in this arena");
    }

    const updatedArena = await prisma.arena.update({
      where: { arenaId: input.arenaId },
      data: {
        status: "PICKING",
      },
    });

    // Trigger Keeper processing
    void processKeeperJob(input.arenaId).catch(() => {});

    return updatedArena;
  }

  /**
   * Synchronize DB arena state with on-chain smart contract
   */
  static async syncOnChainArenaState(arenaId: bigint) {
    const arena = await prisma.arena.findUnique({ where: { arenaId } });
    if (!arena || !xolatAddress) {
      return arena;
    }

    try {
      const onChainData = (await publicClient.readContract({
        address: xolatAddress,
        abi: xolatAbi,
        functionName: "getArena",
        args: [arenaId],
      })) as unknown as readonly [
        bigint, // arenaId
        bigint, // betAmount
        number, // maxPlayers
        number, // playerCount
        boolean, // settled
        `0x${string}`, // winner
        bigint, // createdAt
        readonly `0x${string}`[], // players
        number // status uint8 enum
      ];

      const [
        ,
        ,
        ,
        onChainPlayerCount,
        ,
        ,
        ,
        onChainPlayers,
        onChainStatusIndex,
      ] = onChainData;

      const syncedStatus = ONCHAIN_STATUS_MAP[onChainStatusIndex] || arena.status;
      const syncedPlayers = onChainPlayers.map((p) => p.toLowerCase());

      const updated = await prisma.arena.update({
        where: { arenaId },
        data: {
          currentPlayers: Number(onChainPlayerCount),
          players: syncedPlayers,
          status: syncedStatus,
        },
      });

      // Trigger background Keeper job processing
      if (syncedStatus !== "SETTLED" && syncedStatus !== "REFUNDED" && syncedStatus !== "EXPIRED") {
        void processKeeperJob(arenaId).catch(() => {});
      }

      return updated;
    } catch (err) {
      console.warn(`[ArenaService] On-chain sync warning for arena #${arenaId.toString()}:`, err);
      return arena;
    }
  }
}

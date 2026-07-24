import { prisma } from "@/lib/prisma";
import { DbArenaStatus } from "@prisma/client";
import { publicClient } from "@/lib/keeper/wallet";
import { xolatAbi, xolatAddress } from "@/lib/contracts";

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
   * Create an arena record in DB
   */
  static async createArena(input: CreateArenaInput) {
    const creatorLower = input.creatorAddress.toLowerCase();

    return prisma.arena.create({
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
  }

  /**
   * Join an existing arena in DB with strict duplicate check and status validation
   */
  static async joinArena(input: JoinArenaInput) {
    const playerLower = input.playerAddress.toLowerCase();
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

    return prisma.arena.update({
      where: { arenaId: input.arenaId },
      data: {
        currentPlayers: nextCount,
        players: [...arena.players, playerLower],
        status: nextStatus,
      },
    });
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

    return prisma.arena.update({
      where: { arenaId: input.arenaId },
      data: {
        status: "PICKING",
      },
    });
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
        onChainSettled,
        onChainWinner,
        ,
        onChainPlayers,
        onChainStatusIndex,
      ] = onChainData;

      const syncedStatus = ONCHAIN_STATUS_MAP[onChainStatusIndex] || arena.status;
      const syncedPlayers = onChainPlayers.map((p) => p.toLowerCase());

      return prisma.arena.update({
        where: { arenaId },
        data: {
          currentPlayers: Number(onChainPlayerCount),
          players: syncedPlayers,
          status: syncedStatus,
        },
      });
    } catch (err) {
      console.warn(`[ArenaService] On-chain sync warning for arena #${arenaId.toString()}:`, err);
      return arena;
    }
  }
}

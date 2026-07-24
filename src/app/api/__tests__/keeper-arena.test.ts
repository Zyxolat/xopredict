import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerArenaEvent } from "@/lib/keeper/listener";
import { getStageDescription } from "@/lib/keeper/types";

const mockPrisma = vi.hoisted(() => ({
  keeperJob: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  arena: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  round: {
    upsert: vi.fn(),
    findFirst: vi.fn(),
  },
  player: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
}));

const mockPublicClient = vi.hoisted(() => ({
  readContract: vi.fn(),
  getGasPrice: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
}));

const mockWalletClient = vi.hoisted(() => ({
  writeContract: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/keeper/wallet", () => ({
  publicClient: mockPublicClient,
  getRelayerWalletClient: () => mockWalletClient,
  getRelayerAccount: () => "0xRelayerAccountAddress",
  checkRelayerBalance: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/lib/contracts", () => ({
  xolatAddress: "0x1111111111111111111111111111111111111111",
  xolatAbi: [],
}));

describe("Phase 4.4 - Arena Keeper Integration & State Machine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Keeper Listener for Arena Events", () => {
    it("registers an Arena KeeperJob idempotently", async () => {
      mockPrisma.keeperJob.upsert.mockResolvedValue({
        id: "keeper-job-uuid-1",
        arenaId: 100n,
        type: "ARENA",
        stage: "WAIT_FOR_FULL_ARENA",
        status: "PENDING",
      });

      const job = await registerArenaEvent({
        arenaId: 100n,
        creatorAddress: "0xCreatorAddress",
        betAmount: "10",
        maxPlayers: 2,
      });

      expect(mockPrisma.keeperJob.upsert).toHaveBeenCalledWith({
        where: { arenaId: 100n },
        update: {},
        create: {
          arenaId: 100n,
          type: "ARENA",
          playerAddress: "0xCreatorAddress",
          betAmount: "10",
          cardIndex: 0,
          stage: "WAIT_FOR_FULL_ARENA",
          status: "PENDING",
        },
      });

      expect(job?.stage).toBe("WAIT_FOR_FULL_ARENA");
    });
  });

  describe("Keeper Job Stage Descriptions", () => {
    it("returns appropriate descriptions for all Arena stages", () => {
      expect(getStageDescription("WAIT_FOR_FULL_ARENA", "PENDING")).toContain("Waiting for players to fill arena");
      expect(getStageDescription("WAIT_FOR_ALL_CARD_PICKS", "PENDING")).toContain("Waiting for all players to pick");
      expect(getStageDescription("REQUEST_RANDOMNESS", "PENDING")).toContain("requestRandomness()");
      expect(getStageDescription("AWAIT_WITNET", "PENDING")).toContain("Witnet oracle");
      expect(getStageDescription("FETCH_RANDOMNESS", "PENDING")).toContain("Fetching verified randomness");
      expect(getStageDescription("SETTLE_ARENA", "PENDING")).toContain("Settling arena round");
      expect(getStageDescription("SYNC_DATABASE", "PENDING")).toContain("Synchronizing database");
      expect(getStageDescription("COMPLETED", "COMPLETED")).toContain("Game completed & settled");
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerRoundCreatedEvent, registerArenaEvent } from "@/lib/keeper/listener";
import { processKeeperJob, processArenaJob } from "@/lib/keeper/processor";
import { getStageDescription } from "@/lib/keeper/types";

const mockPrisma = vi.hoisted(() => ({
  keeperJob: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    create: vi.fn(),
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
    it("registers an Arena KeeperJob idempotently on RoundCreated", async () => {
      mockPrisma.keeperJob.findFirst.mockResolvedValue(null);
      mockPrisma.keeperJob.create.mockResolvedValue({
        id: "keeper-job-uuid-1",
        roundId: 50n,
        arenaId: 100n,
        type: "ARENA",
        stage: "REQUEST_RANDOMNESS",
        status: "PENDING",
      });

      const job = await registerRoundCreatedEvent({
        roundId: 50n,
        roundType: "arena",
        arenaId: 100n,
        playerAddress: "0xPlayer1",
        potUsdm: "20",
      });

      expect(mockPrisma.keeperJob.create).toHaveBeenCalledWith({
        data: {
          roundId: 50n,
          arenaId: 100n,
          type: "ARENA",
          playerAddress: "0xPlayer1",
          betAmount: "20",
          cardIndex: 0,
          stage: "REQUEST_RANDOMNESS",
          status: "PENDING",
        },
      });

      expect(job?.stage).toBe("REQUEST_RANDOMNESS");
    });

    it("prevents duplicate Arena KeeperJob creation", async () => {
      mockPrisma.keeperJob.findFirst.mockResolvedValue({
        id: "existing-job-1",
        arenaId: 100n,
        roundId: 50n,
        type: "ARENA",
        stage: "REQUEST_RANDOMNESS",
      });

      mockPrisma.keeperJob.update.mockResolvedValue({
        id: "existing-job-1",
        arenaId: 100n,
        roundId: 50n,
        type: "ARENA",
        stage: "REQUEST_RANDOMNESS",
        status: "PENDING",
      });

      const job = await registerRoundCreatedEvent({
        roundId: 50n,
        roundType: "arena",
        arenaId: 100n,
        playerAddress: "0xPlayer1",
        potUsdm: "20",
      });

      expect(mockPrisma.keeperJob.create).not.toHaveBeenCalled();
      expect(mockPrisma.keeperJob.update).toHaveBeenCalledWith({
        where: { id: "existing-job-1" },
        data: expect.objectContaining({
          roundId: 50n,
          arenaId: 100n,
          stage: "REQUEST_RANDOMNESS",
        }),
      });

      expect(job?.id).toBe("existing-job-1");
    });

    it("ignores non-arena events without creating job", async () => {
      const res = await registerRoundCreatedEvent({
        roundId: 50n,
        roundType: "other",
        arenaId: null,
        playerAddress: "0xPlayer1",
        potUsdm: "20",
      });

      expect(res).toBeNull();
    });
  });

  describe("Arena Keeper Processor Lifecycle & Idempotency", () => {
    it("skips fetchRandomness if round is already revealed on-chain", async () => {
      mockPublicClient.readContract.mockResolvedValue([
        50n, "arena", "0xPlayer1", 100n, "0xCommit", "seed1", "seed2", 1n, "0xRandomness",
        [10n, 20n], "0xWinner", 20000000000000000000n, "0xTx", 0, "revealed", 1000n
      ]);

      const job = {
        id: "job-1",
        arenaId: 100n,
        roundId: 50n,
        stage: "FETCH_RANDOMNESS",
        status: "PROCESSING",
        createdAt: new Date(),
      };

      mockPrisma.arena.update.mockResolvedValue({});
      mockPrisma.keeperJob.update.mockResolvedValue({
        ...job,
        stage: "SETTLE_ARENA",
      });

      await processArenaJob(job);

      // Should NOT call writeContract for fetchRandomness
      expect(mockWalletClient.writeContract).not.toHaveBeenCalledWith(
        expect.objectContaining({ functionName: "fetchRandomness" })
      );
      expect(mockPrisma.keeperJob.update).toHaveBeenCalledWith({
        where: { id: "job-1" },
        data: expect.objectContaining({
          stage: "SETTLE_ARENA",
        }),
      });
    });

    it("skips settleRound if round is already completed on-chain", async () => {
      mockPublicClient.readContract.mockImplementation(async ({ functionName }) => {
        if (functionName === "getRound") {
          return [
            50n, "arena", "0xPlayer1", 100n, "0xCommit", "seed1", "seed2", 1n, "0xRandomness",
            [10n, 20n], "0xWinner", 20000000000000000000n, "0xSettleTx", 0, "completed", 1000n
          ];
        }
        return null;
      });

      mockPrisma.arena.findUnique.mockResolvedValue({ arenaId: 100n, status: "REVEALED" });
      mockPrisma.arena.update.mockResolvedValue({});
      mockPrisma.round.upsert.mockResolvedValue({});
      mockPrisma.player.findFirst.mockResolvedValue({ id: "p1", address: "0xWinner" });
      mockPrisma.player.update.mockResolvedValue({});
      mockPrisma.keeperJob.update.mockResolvedValue({
        id: "job-1",
        stage: "COMPLETED",
        status: "COMPLETED",
      });

      const job = {
        id: "job-1",
        arenaId: 100n,
        roundId: 50n,
        stage: "SETTLE_ARENA",
        status: "PROCESSING",
        createdAt: new Date(),
      };

      const res = await processArenaJob(job);

      // Should NOT writeContract for settleRound
      expect(mockWalletClient.writeContract).not.toHaveBeenCalled();
      expect(res.stage).toBe("COMPLETED");
      expect(res.status).toBe("COMPLETED");
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

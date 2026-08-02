import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as arenasGet, POST as arenasPost } from "@/app/api/arenas/route";
import { GET as openGet } from "@/app/api/arenas/open/route";
import { GET as idGet } from "@/app/api/arenas/[id]/route";
import { POST as joinPost } from "@/app/api/arenas/join/route";
import { POST as pickPost } from "@/app/api/arenas/pick/route";
import { GET as statusGet } from "@/app/api/arenas/[id]/status/route";
import { POST as privatePost } from "@/app/api/private-arenas/route";

const SELF_USER_ID = "aaaaaaaa-0000-4000-8000-000000000001";
const SELF_PLAYER_ID = "bbbbbbbb-0000-4000-8000-000000000001";
const PLAYER1_ADDR = "0x1111111111111111111111111111111111111111";
const PLAYER2_ADDR = "0x2222222222222222222222222222222222222222";

const mockGetServerSession = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn() },
  player: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
  arena: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
  privateArena: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
}));

const mockReadContract = vi.hoisted(() => vi.fn());

vi.mock("next-auth", () => ({
  getServerSession: mockGetServerSession,
  default: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/keeper/wallet", () => ({
  publicClient: { readContract: mockReadContract },
}));
vi.mock("@/lib/contracts", async () => {
  const actual = await vi.importActual<typeof import("@/lib/contracts")>("@/lib/contracts");
  return {
    ...actual,
    xolatAddress: "0x9999999999999999999999999999999999999999" as `0x${string}`,
  };
});

function authedSession(address: string = PLAYER1_ADDR) {
  mockGetServerSession.mockResolvedValue({
    user: { id: SELF_USER_ID, name: "Alice", email: "alice@example.com" },
  });
  mockPrisma.user.findUnique.mockResolvedValue({
    id: SELF_USER_ID,
    isAdmin: false,
  });
  mockPrisma.player.findUnique.mockResolvedValue({
    id: SELF_PLAYER_ID,
    address,
    isBanned: false,
  });
}

function reqJSON(url: string, body: unknown, method = "POST"): NextRequest {
  return new NextRequest(new URL(url, "http://localhost"), {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Phase 4.2 Arena Backend & Persistence APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/arenas (Public Discovery & Pagination)", () => {
    it("returns paginated arenas with status filter", async () => {
      mockPrisma.arena.count.mockResolvedValue(15);
      mockPrisma.arena.findMany.mockResolvedValue([
        {
          id: "arena-1",
          arenaId: 1n,
          creatorAddress: PLAYER1_ADDR,
          betAmount: "10",
          maxPlayers: 4,
          currentPlayers: 1,
          status: "OPEN",
          players: [PLAYER1_ADDR],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const req = new NextRequest("http://localhost/api/arenas?page=1&limit=10&status=OPEN");
      const res = await arenasGet(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.pagination.total).toBe(15);
      expect(json.data.pagination.totalPages).toBe(2);
      expect(json.data.arenas).toHaveLength(1);
      expect(json.data.arenas[0].status).toBe("OPEN");
    });
  });

  describe("GET /api/arenas/open", () => {
    it("returns open joinable arenas", async () => {
      mockPrisma.arena.findMany.mockResolvedValue([
        {
          id: "arena-1",
          arenaId: 1n,
          status: "OPEN",
          currentPlayers: 1,
          maxPlayers: 2,
        },
      ]);

      const res = await openGet();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.arenas).toHaveLength(1);
    });
  });

  describe("GET /api/arenas/[id]", () => {
    it("returns arena details by arenaId", async () => {
      mockPrisma.arena.findUnique.mockResolvedValue({
        id: "arena-uuid-1",
        arenaId: 10n,
        creatorAddress: PLAYER1_ADDR,
        status: "OPEN",
      });

      const req = new NextRequest("http://localhost/api/arenas/10");
      const res = await idGet(req, { params: { id: "10" } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.arena.status).toBe("OPEN");
    });

    it("returns 404 when arena is not found", async () => {
      mockPrisma.arena.findUnique.mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/arenas/999");
      const res = await idGet(req, { params: { id: "999" } });
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/arenas (Create)", () => {
    it("requires authentication", async () => {
      mockGetServerSession.mockResolvedValue(null);
      const req = reqJSON("http://localhost/api/arenas", {
        arenaId: "1",
        betAmount: "10",
        maxPlayers: 2,
        creatorAddress: PLAYER1_ADDR,
      });
      const res = await arenasPost(req);
      expect(res.status).toBe(401);
    });

    it("creates arena record in Prisma DB", async () => {
      authedSession();
      mockReadContract.mockResolvedValueOnce([
        1n,
        10n * 10n ** 18n,
        2,
        1,
        false,
        PLAYER1_ADDR.toLowerCase(),
        BigInt(Math.floor(Date.now() / 1000)),
        [PLAYER1_ADDR.toLowerCase()],
        0,
      ]);
      mockPrisma.arena.create.mockResolvedValue({
        id: "arena-uuid-1",
        arenaId: 1n,
        creatorAddress: PLAYER1_ADDR.toLowerCase(),
        betAmount: "10",
        maxPlayers: 2,
        currentPlayers: 1,
        status: "OPEN",
        players: [PLAYER1_ADDR.toLowerCase()],
      });

      const req = reqJSON("http://localhost/api/arenas", {
        arenaId: "1",
        betAmount: "10",
        maxPlayers: 2,
        creatorAddress: PLAYER1_ADDR,
      });

      const res = await arenasPost(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.arenaId).toBe("1");
      expect(json.data.status).toBe("OPEN");
    });
  });

  describe("POST /api/arenas/join (Join & Duplicate Prevention)", () => {
    it("prevents duplicate joins from the same player", async () => {
      authedSession();
      mockPrisma.arena.findUnique.mockResolvedValue({
        id: "arena-uuid-1",
        arenaId: 1n,
        maxPlayers: 4,
        currentPlayers: 1,
        status: "OPEN",
        players: [PLAYER1_ADDR.toLowerCase()],
      });

      const req = reqJSON("http://localhost/api/arenas/join", {
        arenaId: "1",
        playerAddress: PLAYER1_ADDR,
      });

      const res = await joinPost(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("already joined");
    });

    it("rejects join if arena status is not OPEN", async () => {
      authedSession(PLAYER2_ADDR);
      mockPrisma.arena.findUnique.mockResolvedValue({
        id: "arena-uuid-1",
        arenaId: 1n,
        maxPlayers: 4,
        currentPlayers: 4,
        status: "FULL",
        players: [PLAYER1_ADDR.toLowerCase()],
      });

      const req = reqJSON("http://localhost/api/arenas/join", {
        arenaId: "1",
        playerAddress: PLAYER2_ADDR,
      });

      const res = await joinPost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Cannot join arena in FULL status");
    });

    it("successfully joins and sets status FULL when maxPlayers reached", async () => {
      authedSession(PLAYER2_ADDR);
      mockPrisma.arena.findUnique
        .mockResolvedValueOnce({
          id: "arena-uuid-1",
          arenaId: 1n,
          maxPlayers: 2,
          currentPlayers: 1,
          status: "OPEN",
          players: [PLAYER1_ADDR.toLowerCase()],
        })
        .mockResolvedValueOnce({
          id: "arena-uuid-1",
          arenaId: 1n,
          maxPlayers: 2,
          currentPlayers: 2,
          status: "FULL",
          players: [PLAYER1_ADDR.toLowerCase(), PLAYER2_ADDR.toLowerCase()],
        });

      mockPrisma.arena.updateMany.mockResolvedValue({ count: 1 });

      const req = reqJSON("http://localhost/api/arenas/join", {
        arenaId: "1",
        playerAddress: PLAYER2_ADDR,
      });

      const res = await joinPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.arena.currentPlayers).toBe(2);
      expect(json.data.arena.status).toBe("FULL");
    });
  });

  describe("POST /api/arenas/pick (Card Picking)", () => {
    it("validates player is in arena and status is valid", async () => {
      authedSession();
      mockPrisma.arena.findUnique.mockResolvedValue({
        id: "arena-uuid-1",
        arenaId: 1n,
        status: "FULL",
        players: [PLAYER1_ADDR.toLowerCase(), PLAYER2_ADDR.toLowerCase()],
      });

      mockPrisma.arena.update.mockResolvedValue({
        id: "arena-uuid-1",
        arenaId: 1n,
        status: "PICKING",
        players: [PLAYER1_ADDR.toLowerCase(), PLAYER2_ADDR.toLowerCase()],
      });

      const req = reqJSON("http://localhost/api/arenas/pick", {
        arenaId: "1",
        playerAddress: PLAYER1_ADDR,
        cardIndex: 2,
      });

      const res = await pickPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.arena.status).toBe("PICKING");
    });
  });

  describe("GET /api/arenas/[id]/status (Polling & Sync)", () => {
    it("returns status object and syncs with database", async () => {
      mockPrisma.arena.findUnique.mockResolvedValue({
        id: "arena-uuid-1",
        arenaId: 1n,
        status: "OPEN",
        currentPlayers: 1,
        maxPlayers: 2,
      });

      const req = new NextRequest("http://localhost/api/arenas/1/status");
      const res = await statusGet(req, { params: { id: "1" } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(["OPEN", "WAITING_FOR_PLAYERS"]).toContain(json.data.status);
      expect(json.data.currentPlayers).toBe(1);
    });
  });

  describe("POST /api/private-arenas (Prisma Persistence)", () => {
    it("creates a private arena in Prisma DB", async () => {
      authedSession();
      mockPrisma.player.findUnique.mockResolvedValue({
        id: SELF_PLAYER_ID,
        userId: SELF_USER_ID,
      });

      mockPrisma.privateArena.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: "private-uuid-1",
          creatorId: data.creatorId,
          inviteCode: data.inviteCode,
          betAmount: data.betAmount,
          maxPlayers: data.maxPlayers,
          currentPlayers: 1,
          status: "active",
          playerIds: [SELF_PLAYER_ID],
          createdAt: new Date(),
          expiresAt: data.expiresAt,
        })
      );

      const req = reqJSON("http://localhost/api/private-arenas", {
        playerId: SELF_PLAYER_ID,
        betAmount: 10,
        maxPlayers: 4,
      });

      const res = await privatePost(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.arena.inviteCode).toBeDefined();
      expect(json.data.arena.status).toBe("active");
    });
  });
});

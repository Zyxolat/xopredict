/**
 * API route authentication tests.
 *
 * For every protected route handler this file proves:
 *   • Unauthenticated request  → 401
 *   • Wrong player (self-check) → 403
 *   • Correct caller           → not 401 / not 403  (business logic may still
 *                                 return 4xx/5xx – that is fine, auth passed)
 *   • Non-admin on admin route → 403
 *   • Admin on admin route     → not 401 / not 403
 *
 * Mocks:
 *   - next-auth           getServerSession return value is controlled per test
 *   - @/lib/prisma        a prisma mock object is used so no DB connection is
 *                         needed; individual methods are reset before each test
 *   - @/lib/gamification  pure helpers that do not affect auth – stubbed to
 *                         avoid import-time side-effects
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Static route imports – all loaded once before any test runs (no per-test timeout cost).
import { POST as adminPost } from "@/app/api/admin/route";
import { POST as arenasPost } from "@/app/api/arenas/route";
import { GET as cosmeticsGet, POST as cosmeticsPost } from "@/app/api/cosmetics/route";
import { GET as dailyFreePlayGet, POST as dailyFreePlayPost } from "@/app/api/daily-free-play/route";
import { GET as playersGet } from "@/app/api/players/[playerId]/route";
import { GET as playersMeGet } from "@/app/api/players/me/route";
import { POST as onboardPost } from "@/app/api/players/[playerId]/onboard/route";
import { GET as privateArenasGet, POST as privateArenasPost } from "@/app/api/private-arenas/route";
import { GET as referralsGet, POST as referralsPost } from "@/app/api/referrals/route";
import { POST as seasonsPost } from "@/app/api/seasons/route";
import { POST as soloPost } from "@/app/api/solo/route";
import { GET as vipGet, POST as vipPost } from "@/app/api/vip/route";

// ── Fixed IDs used across all tests ──────────────────────────────────────────
const SELF_USER_ID   = "aaaaaaaa-0000-4000-8000-000000000001";
const SELF_PLAYER_ID = "bbbbbbbb-0000-4000-8000-000000000001";
const OTHER_PLAYER_ID = "cccccccc-0000-4000-8000-000000000099";
const FAKE_TX = "0x" + "a".repeat(64);

// ── Hoisted mock objects (referenced inside vi.mock factories) ────────────────
const mockGetServerSession = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
  user:              { findUnique: vi.fn(), update: vi.fn() },
  player:            { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), create: vi.fn(), count: vi.fn() },
  round:             { create: vi.fn(), findMany: vi.fn() },
  referral:          { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn() },
  cosmeticOwned:     { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
  season:            { findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
  seasonXp:          { findUnique: vi.fn(), findMany: vi.fn() },
  privateArena:      { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
  verificationToken: { findUnique: vi.fn(), create: vi.fn() },
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("next-auth", () => ({
  getServerSession: mockGetServerSession,
  default: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ authOptions: {} }));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

vi.mock("@/lib/gamification", () => ({
  getCosmeticPrice:         vi.fn().mockReturnValue(5),
  validateCosmeticPurchase: vi.fn().mockReturnValue({ valid: true }),
  isEligibleForFreePlay:    vi.fn().mockReturnValue(true),
  calculateDailyMultiplier: vi.fn().mockReturnValue(1),
  calculateFreePlayAmount:  vi.fn().mockReturnValue("1.0"),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Valid NextAuth session for SELF */
const selfSession = () => ({ user: { id: SELF_USER_ID, address: "0x1234" } });

/** Prisma user row (non-admin) */
const selfUserRow = () => ({ id: SELF_USER_ID, isAdmin: false });

/** Prisma player row for SELF */
const selfPlayerRow = () => ({ id: SELF_PLAYER_ID, address: "0x1234", isBanned: false });

/** Admin prisma user row */
const adminUserRow = () => ({ id: SELF_USER_ID, isAdmin: true });

/**
 * Configure the prisma mock so auth helpers succeed for SELF.
 * Individual test cases override only the specific parts they need.
 */
function authAsSelf() {
  mockGetServerSession.mockResolvedValue(selfSession());
  mockPrisma.user.findUnique.mockResolvedValue(selfUserRow());
  mockPrisma.player.findUnique.mockResolvedValue(selfPlayerRow());
}

function authAsAdmin() {
  mockGetServerSession.mockResolvedValue(selfSession());
  mockPrisma.user.findUnique.mockResolvedValue(adminUserRow());
  mockPrisma.player.findUnique.mockResolvedValue(selfPlayerRow());
}

function notAuthenticated() {
  mockGetServerSession.mockResolvedValue(null);
}

/**
 * Auth as SELF but prisma returns a DIFFERENT player for the session user.
 * This triggers requireSelf / assertSelf to return 403.
 */
function authAsWrongPlayer() {
  mockGetServerSession.mockResolvedValue(selfSession());
  mockPrisma.user.findUnique.mockResolvedValue(selfUserRow());
  // Session resolves to OTHER_PLAYER_ID, but request body targets SELF_PLAYER_ID.
  mockPrisma.player.findUnique.mockResolvedValue({
    id: OTHER_PLAYER_ID,
    address: "0xother",
    isBanned: false,
  });
}

function json(url: string, body: unknown, method = "POST"): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function get(url: string): NextRequest {
  return new NextRequest(url, { method: "GET" });
}

// Reset all mocks before each test so state never bleeds.
beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin — requireAdmin
// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/admin", () => {
  async function call(body: unknown) {
    return adminPost(json("http://localhost/api/admin", body));
  }

  it("returns 401 when not authenticated", async () => {
    notAuthenticated();
    const res = await call({ action: "ban", playerId: SELF_PLAYER_ID });
    expect(res.status).toBe(401);
  });

  it("returns 403 when non-admin user", async () => {
    authAsSelf(); // selfUserRow has isAdmin: false
    const res = await call({ action: "ban", playerId: SELF_PLAYER_ID });
    expect(res.status).toBe(403);
  });

  it("passes auth for admin user (may return business-logic error)", async () => {
    authAsAdmin();
    // Player.update is not mocked → will throw → route catches and returns 500 or similar
    // Importantly it must NOT be 401 or 403.
    mockPrisma.player.update.mockResolvedValue({ id: SELF_PLAYER_ID });
    const res = await call({ action: "ban", playerId: SELF_PLAYER_ID });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/arenas — requireSession
// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/arenas", () => {
  async function call(body: unknown) {
    return arenasPost(json("http://localhost/api/arenas", body));
  }

  it("returns 401 when not authenticated", async () => {
    notAuthenticated();
    const res = await call({ roundId: "1", betAmount: "1.0", maxPlayers: 2, transactionHash: FAKE_TX, commitment: "some-commitment-xyz" });
    expect(res.status).toBe(401);
  });

  it("passes auth for authenticated user", async () => {
    authAsSelf();
    mockPrisma.round.create.mockResolvedValue({ id: "round-1", roundId: 1 });
    const res = await call({ roundId: "1", betAmount: "1.0", maxPlayers: 2, transactionHash: FAKE_TX, commitment: "some-commitment-xyz" });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cosmetics?playerId=  — requireSelf
// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/cosmetics?playerId=", () => {
  async function call(playerId: string) {
    return cosmeticsGet(get(`http://localhost/api/cosmetics?playerId=${playerId}`));
  }

  it("returns 401 when not authenticated", async () => {
    notAuthenticated();
    const res = await call(SELF_PLAYER_ID);
    expect(res.status).toBe(401);
  });

  it("returns 403 for wrong player", async () => {
    authAsWrongPlayer();
    const res = await call(SELF_PLAYER_ID);
    expect(res.status).toBe(403);
  });

  it("passes auth for self", async () => {
    authAsSelf();
    mockPrisma.cosmeticOwned.findMany.mockResolvedValue([]);
    const res = await call(SELF_PLAYER_ID);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/cosmetics — requireSession + assertSelf
// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/cosmetics", () => {
  async function call(body: unknown) {
    return cosmeticsPost(json("http://localhost/api/cosmetics", body));
  }

  it("returns 401 when not authenticated", async () => {
    notAuthenticated();
    const res = await call({ playerId: SELF_PLAYER_ID, type: "card_back", name: "gold" });
    expect(res.status).toBe(401);
  });

  it("returns 403 when player mismatch (wrong player in session)", async () => {
    authAsWrongPlayer();
    const res = await call({ playerId: SELF_PLAYER_ID, type: "card_back", name: "gold" });
    expect(res.status).toBe(403);
  });

  it("passes auth for self", async () => {
    authAsSelf();
    mockPrisma.player.findUnique.mockResolvedValue({ ...selfPlayerRow(), xolat: "100" });
    mockPrisma.cosmeticOwned.findFirst.mockResolvedValue(null);
    mockPrisma.cosmeticOwned.create.mockResolvedValue({ id: "c1" });
    const res = await call({ playerId: SELF_PLAYER_ID, type: "card_back", name: "gold" });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/daily-free-play — requireSession + assertSelf
// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/daily-free-play", () => {
  async function call(body: unknown) {
    return dailyFreePlayPost(json("http://localhost/api/daily-free-play", body));
  }

  it("returns 401 when not authenticated", async () => {
    notAuthenticated();
    const res = await call({ playerId: SELF_PLAYER_ID });
    expect(res.status).toBe(401);
  });

  it("returns 403 for wrong player", async () => {
    authAsWrongPlayer();
    const res = await call({ playerId: SELF_PLAYER_ID });
    expect(res.status).toBe(403);
  });

  it("passes auth for self", async () => {
    authAsSelf();
    mockPrisma.player.findUnique.mockResolvedValue({ ...selfPlayerRow(), isBanned: false, lastFreePlay: null, streakDays: 0 });
    mockPrisma.round.create.mockResolvedValue({ id: "r1", roundId: BigInt(Date.now()) });
    mockPrisma.player.update.mockResolvedValue({ id: SELF_PLAYER_ID });
    const res = await call({ playerId: SELF_PLAYER_ID });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/daily-free-play?playerId= — requireSelf
// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/daily-free-play?playerId=", () => {
  async function call(playerId: string) {
    return dailyFreePlayGet(get(`http://localhost/api/daily-free-play?playerId=${playerId}`));
  }

  it("returns 401 when not authenticated", async () => {
    notAuthenticated();
    const res = await call(SELF_PLAYER_ID);
    expect(res.status).toBe(401);
  });

  it("returns 403 for wrong player", async () => {
    authAsWrongPlayer();
    const res = await call(SELF_PLAYER_ID);
    expect(res.status).toBe(403);
  });

  it("passes auth for self", async () => {
    authAsSelf();
    mockPrisma.player.findUnique.mockResolvedValue({ ...selfPlayerRow(), lastFreePlay: null, streakDays: 0 });
    const res = await call(SELF_PLAYER_ID);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/players/[playerId] — requireSelf
// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/players/[playerId]", () => {
  async function call(playerId: string) {
    const req = get(`http://localhost/api/players/${playerId}`);
    return (playersGet as Function)(req, { params: { playerId } });
  }

  it("returns 401 when not authenticated", async () => {
    notAuthenticated();
    const res = await call(SELF_PLAYER_ID);
    expect(res.status).toBe(401);
  });

  it("returns 403 for wrong player", async () => {
    authAsWrongPlayer();
    const res = await call(SELF_PLAYER_ID);
    expect(res.status).toBe(403);
  });

  it("passes auth for self", async () => {
    authAsSelf();
    mockPrisma.player.findUnique.mockResolvedValue(selfPlayerRow());
    const res = await call(SELF_PLAYER_ID);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/players/me — requireSession
// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/players/me", () => {
  async function call() {
    const req = get("http://localhost/api/players/me");
    return (playersMeGet as Function)(req);
  }

  it("returns 401 when not authenticated", async () => {
    notAuthenticated();
    const res = await call();
    expect(res.status).toBe(401);
  });

  it("passes auth for self", async () => {
    authAsSelf();
    mockPrisma.player.findUnique.mockResolvedValue(selfPlayerRow());
    const res = await call();
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/players/[playerId]/onboard — requireSelf
// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/players/[playerId]/onboard", () => {
  async function call(playerId: string) {
    const req = json(`http://localhost/api/players/${playerId}/onboard`, {});
    return (onboardPost as Function)(req, { params: { playerId } });
  }

  it("returns 401 when not authenticated", async () => {
    notAuthenticated();
    const res = await call(SELF_PLAYER_ID);
    expect(res.status).toBe(401);
  });

  it("returns 403 for wrong player", async () => {
    authAsWrongPlayer();
    const res = await call(SELF_PLAYER_ID);
    expect(res.status).toBe(403);
  });

  it("passes auth for self", async () => {
    authAsSelf();
    mockPrisma.player.update.mockResolvedValue({ id: SELF_PLAYER_ID, onboarded: true });
    const res = await call(SELF_PLAYER_ID);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/private-arenas?code=  — requireSession
// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/private-arenas?code=", () => {
  async function call(code: string) {
    return privateArenasGet(get(`http://localhost/api/private-arenas?code=${code}`));
  }

  it("returns 401 when not authenticated", async () => {
    notAuthenticated();
    const res = await call("INVITE123");
    expect(res.status).toBe(401);
  });

  it("passes auth for authenticated user (code not found → 404, but not 401/403)", async () => {
    authAsSelf();
    const res = await call("INVITE123");
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/private-arenas?playerId=  — requireSelf
// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/private-arenas?playerId=", () => {
  async function call(playerId: string) {
    return privateArenasGet(get(`http://localhost/api/private-arenas?playerId=${playerId}`));
  }

  it("returns 401 when not authenticated", async () => {
    notAuthenticated();
    const res = await call(SELF_PLAYER_ID);
    expect(res.status).toBe(401);
  });

  it("returns 403 for wrong player", async () => {
    authAsWrongPlayer();
    const res = await call(SELF_PLAYER_ID);
    expect(res.status).toBe(403);
  });

  it("passes auth for self", async () => {
    authAsSelf();
    const res = await call(SELF_PLAYER_ID);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/private-arenas — requireSession + assertSelf
// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/private-arenas", () => {
  async function call(body: unknown) {
    return privateArenasPost(json("http://localhost/api/private-arenas", body));
  }

  const validBody = () => ({
    playerId: SELF_PLAYER_ID,
    betAmount: 10,
    maxPlayers: 2,
  });

  it("returns 401 when not authenticated", async () => {
    notAuthenticated();
    const res = await call(validBody());
    expect(res.status).toBe(401);
  });

  it("returns 403 for wrong player", async () => {
    authAsWrongPlayer();
    const res = await call(validBody());
    expect(res.status).toBe(403);
  });

  it("passes auth for self", async () => {
    authAsSelf();
    const res = await call(validBody());
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/referrals — requireSession + assertSelf
// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/referrals", () => {
  async function call(body: unknown) {
    return referralsPost(json("http://localhost/api/referrals", body));
  }

  it("returns 401 when not authenticated", async () => {
    notAuthenticated();
    const res = await call({ playerId: SELF_PLAYER_ID, referrerId: OTHER_PLAYER_ID });
    expect(res.status).toBe(401);
  });

  it("returns 403 for wrong player", async () => {
    authAsWrongPlayer();
    const res = await call({ playerId: SELF_PLAYER_ID, referrerId: OTHER_PLAYER_ID });
    expect(res.status).toBe(403);
  });

  it("passes auth for self", async () => {
    authAsSelf();
    mockPrisma.referral.findUnique.mockResolvedValue(null);
    mockPrisma.player.findUnique.mockImplementation(({ where }: { where: { id?: string; userId?: string } }) => {
      if (where.userId) return Promise.resolve(selfPlayerRow());
      if (where.id === OTHER_PLAYER_ID) return Promise.resolve({ id: OTHER_PLAYER_ID, address: "0xother", isBanned: false });
      return Promise.resolve(null);
    });
    mockPrisma.referral.create.mockResolvedValue({ id: "ref-1", referrerId: OTHER_PLAYER_ID, refereeId: SELF_PLAYER_ID, bonusClaimed: false });
    const res = await call({ playerId: SELF_PLAYER_ID, referrerId: OTHER_PLAYER_ID });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/referrals?playerId= — requireSelf
// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/referrals?playerId=", () => {
  async function call(playerId: string) {
    return referralsGet(get(`http://localhost/api/referrals?playerId=${playerId}`));
  }

  it("returns 401 when not authenticated", async () => {
    notAuthenticated();
    const res = await call(SELF_PLAYER_ID);
    expect(res.status).toBe(401);
  });

  it("returns 403 for wrong player", async () => {
    authAsWrongPlayer();
    const res = await call(SELF_PLAYER_ID);
    expect(res.status).toBe(403);
  });

  it("passes auth for self", async () => {
    authAsSelf();
    mockPrisma.referral.findUnique.mockResolvedValue(null);
    const res = await call(SELF_PLAYER_ID);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/seasons — requireAdmin
// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/seasons", () => {
  async function call(body: unknown) {
    return seasonsPost(json("http://localhost/api/seasons", body));
  }

  const seasonBody = () => ({
    name: "Season 1",
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 86400000 * 30).toISOString(),
  });

  it("returns 401 when not authenticated", async () => {
    notAuthenticated();
    const res = await call(seasonBody());
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin user", async () => {
    authAsSelf(); // selfUserRow has isAdmin: false
    const res = await call(seasonBody());
    expect(res.status).toBe(403);
  });

  it("passes auth for admin user", async () => {
    authAsAdmin();
    mockPrisma.season.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.season.create.mockResolvedValue({ id: "season-1", name: "Season 1" });
    const res = await call(seasonBody());
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/solo — requireSession + assertSelf
// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/solo", () => {
  async function call(body: unknown) {
    return soloPost(json("http://localhost/api/solo", body));
  }

  const soloBody = () => ({
    roundId: "1",
    playerId: SELF_PLAYER_ID,
    cardIndex: 0,
    transactionHash: FAKE_TX,
  });

  it("returns 401 when not authenticated", async () => {
    notAuthenticated();
    const res = await call(soloBody());
    expect(res.status).toBe(401);
  });

  it("returns 403 for wrong player", async () => {
    authAsWrongPlayer();
    const res = await call(soloBody());
    expect(res.status).toBe(403);
  });

  it("passes auth for self", async () => {
    authAsSelf();
    mockPrisma.player.update.mockResolvedValue({ id: SELF_PLAYER_ID });
    const res = await call(soloBody());
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/vip?playerId= — requireSelf
// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/vip?playerId=", () => {
  async function call(playerId: string) {
    return vipGet(get(`http://localhost/api/vip?playerId=${playerId}`));
  }

  it("returns 401 when not authenticated", async () => {
    notAuthenticated();
    const res = await call(SELF_PLAYER_ID);
    expect(res.status).toBe(401);
  });

  it("returns 403 for wrong player", async () => {
    authAsWrongPlayer();
    const res = await call(SELF_PLAYER_ID);
    expect(res.status).toBe(403);
  });

  it("passes auth for self", async () => {
    authAsSelf();
    mockPrisma.player.findUnique.mockResolvedValue({ ...selfPlayerRow(), vipExpiresAt: null });
    const res = await call(SELF_PLAYER_ID);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/vip — requireSession + assertSelf
// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/vip", () => {
  async function call(body: unknown) {
    return vipPost(json("http://localhost/api/vip", body));
  }

  it("returns 401 when not authenticated", async () => {
    notAuthenticated();
    const res = await call({ playerId: SELF_PLAYER_ID, transactionHash: FAKE_TX });
    expect(res.status).toBe(401);
  });

  it("returns 403 for wrong player", async () => {
    authAsWrongPlayer();
    const res = await call({ playerId: SELF_PLAYER_ID, transactionHash: FAKE_TX });
    expect(res.status).toBe(403);
  });

  it("passes auth for self", async () => {
    authAsSelf();
    mockPrisma.player.findUnique.mockResolvedValue({ ...selfPlayerRow(), vipExpiresAt: null });
    mockPrisma.player.update.mockResolvedValue({ id: SELF_PLAYER_ID });
    const res = await call({ playerId: SELF_PLAYER_ID, transactionHash: FAKE_TX });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

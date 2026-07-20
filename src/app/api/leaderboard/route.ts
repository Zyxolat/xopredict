/**
 * GET /api/leaderboard - Get leaderboard rankings
 * Query params:
 *   - type: "overall" (default) | "season"
 *   - seasonId: (optional) Season ID for season leaderboard
 *   - limit: (optional) Number of results (default: 100, max: 1000)
 *   - offset: (optional) Pagination offset (default: 0)
 *   - address: (optional) Get specific player's rank
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { playerIdSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type") || "overall";
    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get("limit") || "100"),
      1000
    );
    const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");
    const playerId = req.nextUrl.searchParams.get("playerId");
    const seasonId = req.nextUrl.searchParams.get("seasonId");

    if (type === "overall") {
      // Overall leaderboard: top players by totalWonUsdm
      const leaderboard = await prisma.player.findMany({
        where: { isBanned: false },
        select: {
          address: true,
          username: true,
          totalWonUsdm: true,
          rank: true,
          totalPlayed: true,
        },
        orderBy: [{ totalWonUsdm: "desc" }, { createdAt: "asc" }], // Tie-breaker: earliest account
        take: limit,
        skip: offset,
      });

      // Add rank position (accounting for offset)
      const results = leaderboard.map((player, idx) => ({
        ...player,
        position: offset + idx + 1,
        totalWonUsdm: Number(player.totalWonUsdm),
      }));

      // Get player's rank if playerId provided
      let playerRank = null;
      if (playerId) {
        const parsed = playerIdSchema.safeParse(playerId);
        if (parsed.success) {
          const allPlayers = await prisma.player.findMany({
            where: { isBanned: false },
            select: { id: true, totalWonUsdm: true, createdAt: true },
            orderBy: [{ totalWonUsdm: "desc" }, { createdAt: "asc" }],
          });

          const playerIdx = allPlayers.findIndex(
            (p) => p.id === parsed.data
          );
          if (playerIdx !== -1) {
            const player = await prisma.player.findUnique({
              where: { id: parsed.data },
              select: {
                address: true,
                username: true,
                totalWonUsdm: true,
                rank: true,
                totalPlayed: true,
              },
            });
            playerRank = {
              ...player,
              position: playerIdx + 1,
              totalWonUsdm: Number(player?.totalWonUsdm || 0),
            };
          }
        }
      }

      return NextResponse.json({ data: { leaderboard: results, playerRank } });
    } else if (type === "season") {
      // Season leaderboard: top players by XP in season
      const season =
        seasonId &&
        (await prisma.season.findUnique({
          where: { id: seasonId },
        }));

      if (seasonId && !season) {
        return NextResponse.json(
          { error: "Season not found" },
          { status: 404 }
        );
      }

      // Use active season if not specified
      const activeSeason =
        season ||
        (await prisma.season.findFirst({
          where: { isActive: true },
        }));

      if (!activeSeason) {
        return NextResponse.json({ data: { leaderboard: [], playerRank: null } });
      }

      const leaderboard = await prisma.seasonXp.findMany({
        where: { seasonId: activeSeason.id },
        include: {
          player: {
            select: {
              id: true,
              address: true,
              username: true,
              rank: true,
            },
          },
        },
        orderBy: [{ xp: "desc" }, { id: "asc" }], // Tie-breaker: earliest entry by ID
        take: limit,
        skip: offset,
      });

      const results = leaderboard.map((entry, idx) => ({
        position: offset + idx + 1,
        playerId: entry.player.id,
        username: entry.player.username,
        xp: entry.xp,
        rank: entry.player.rank,
      }));

      // Get player's rank if playerId provided
      let playerRank = null;
      if (playerId) {
        const parsed = playerIdSchema.safeParse(playerId);
        if (parsed.success) {
          const allEntries = await prisma.seasonXp.findMany({
            where: { seasonId: activeSeason.id },
            select: { playerId: true, xp: true, id: true },
            orderBy: [{ xp: "desc" }, { id: "asc" }],
          });

          const playerIdx = allEntries.findIndex(
            (e) => e.playerId === parsed.data
          );
          if (playerIdx !== -1) {
            const entry = await prisma.seasonXp.findUnique({
              where: {
                playerId_seasonId: {
                  playerId: parsed.data,
                  seasonId: activeSeason.id,
                },
              },
              include: {
                player: {
                  select: {
                    username: true,
                    rank: true,
                  },
                },
              },
            });

            if (entry) {
              playerRank = {
                position: playerIdx + 1,
                playerId: entry.playerId,
                username: entry.player.username,
                xp: entry.xp,
                rank: entry.player.rank,
              };
            }
          }
        }
      }

      return NextResponse.json({
        data: { leaderboard: results, playerRank, seasonId: activeSeason.id },
      });
    }

    return NextResponse.json(
      { error: "Invalid leaderboard type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}

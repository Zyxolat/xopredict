/**
 * GET /api/leaderboard - Get leaderboard rankings
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
      const leaderboard = await prisma.player.findMany({
        where: { isBanned: false },
        select: {
          id: true,
          totalWonUsdm: true,
          rank: true,
          totalPlayed: true,
          streakDays: true,
          user: {
            select: {
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: [{ totalWonUsdm: "desc" }, { createdAt: "asc" }],
        take: limit,
        skip: offset,
      });

      const results = leaderboard.map((player, idx) => ({
        position: offset + idx + 1,
        id: player.id,
        username: player.user?.username || "Player",
        displayName: player.user?.displayName || player.user?.username || "Player",
        avatarUrl: player.user?.avatarUrl || null,
        rank: player.rank,
        totalPlayed: player.totalPlayed,
        totalWonUsdm: Number(player.totalWonUsdm),
      }));

      let playerRank = null;
      if (playerId) {
        const parsed = playerIdSchema.safeParse(playerId);
        if (parsed.success) {
          const allPlayers = await prisma.player.findMany({
            where: { isBanned: false },
            select: { id: true, totalWonUsdm: true, createdAt: true },
            orderBy: [{ totalWonUsdm: "desc" }, { createdAt: "asc" }],
          });

          const playerIdx = allPlayers.findIndex((p) => p.id === parsed.data);
          if (playerIdx !== -1) {
            const player = await prisma.player.findUnique({
              where: { id: parsed.data },
              select: {
                id: true,
                totalWonUsdm: true,
                rank: true,
                totalPlayed: true,
                user: {
                  select: {
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            });
            if (player) {
              playerRank = {
                position: playerIdx + 1,
                id: player.id,
                username: player.user?.username || "Player",
                displayName: player.user?.displayName || player.user?.username || "Player",
                rank: player.rank,
                totalWonUsdm: Number(player.totalWonUsdm),
              };
            }
          }
        }
      }

      return NextResponse.json({ data: { leaderboard: results, playerRank } });
    } else if (type === "season") {
      const activeSeason =
        seasonId
          ? await prisma.season.findUnique({ where: { id: seasonId } })
          : await prisma.season.findFirst({ where: { isActive: true } });

      if (!activeSeason) {
        return NextResponse.json({ data: { leaderboard: [], playerRank: null } });
      }

      const leaderboard = await prisma.seasonXp.findMany({
        where: { seasonId: activeSeason.id },
        include: {
          player: {
            select: {
              id: true,
              rank: true,
              user: {
                select: {
                  username: true,
                  displayName: true,
                },
              },
            },
          },
        },
        orderBy: [{ xp: "desc" }, { id: "asc" }],
        take: limit,
        skip: offset,
      });

      const results = leaderboard.map((entry, idx) => ({
        position: offset + idx + 1,
        playerId: entry.player.id,
        username: entry.player.user?.username || "Player",
        displayName: entry.player.user?.displayName || entry.player.user?.username || "Player",
        xp: entry.xp,
        rank: entry.player.rank,
      }));

      return NextResponse.json({
        data: { leaderboard: results, seasonId: activeSeason.id },
      });
    }

    return NextResponse.json({ error: "Invalid leaderboard type" }, { status: 400 });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}

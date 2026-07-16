/**
 * GET /api/seasons - Get active seasons and player XP
 * POST /api/seasons - Create new season (admin only)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addressSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get("address");

    // Get active seasons
    const activeSeason = await prisma.season.findFirst({
      where: { isActive: true },
      include: { xp: true },
    });

    if (!activeSeason) {
      return NextResponse.json({
        data: { activeSeason: null, playerXP: null },
      });
    }

    // If address provided, get player's XP
    let playerXP = null;
    if (address) {
      const parsed = addressSchema.safeParse(address);
      if (parsed.success) {
        playerXP = await prisma.seasonXp.findUnique({
          where: {
            playerAddress_seasonId: {
              playerAddress: parsed.data.toLowerCase(),
              seasonId: activeSeason.id,
            },
          },
        });
      }
    }

    // Get leaderboard (top 100 by XP)
    const leaderboard = await prisma.seasonXp.findMany({
      where: { seasonId: activeSeason.id },
      include: { player: { select: { username: true, rank: true } } },
      orderBy: { xp: "desc" },
      take: 100,
    });

    return NextResponse.json({
      data: {
        activeSeason: {
          id: activeSeason.id,
          name: activeSeason.name,
          startDate: activeSeason.startDate,
          endDate: activeSeason.endDate,
        },
        playerXP,
        leaderboard: leaderboard.map((entry, idx) => ({
          rank: idx + 1,
          playerAddress: entry.playerAddress,
          username: entry.player.username,
          playerRank: entry.player.rank,
          xp: entry.xp,
        })),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    // In production, verify JWT/admin token
    const isAdmin = authHeader?.includes("admin-token-here");

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, durationDays } = await req.json();

    if (!name || !durationDays) {
      return NextResponse.json(
        { error: "Name and durationDays required" },
        { status: 400 }
      );
    }

    // Close current active season
    await prisma.season.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Create new season
    const now = new Date();
    const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const season = await prisma.season.create({
      data: {
        name,
        startDate: now,
        endDate,
        isActive: true,
      },
    });

    return NextResponse.json(
      { data: { season } },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

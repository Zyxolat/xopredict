/**
 * GET /api/live-feed - Real-time feed of wins
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");

    // Get recent wins
    const wins = await prisma.round.findMany({
      where: {
        status: "completed",
        winnerAddress: { not: null },
        potUsdm: { not: null },
      },
      include: {
        picks: true,
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
    });

    // Format for live feed
    const feed = wins.map((win: typeof wins[number]) => ({
      winner: win.winnerAddress,
      amount: Number(win.potUsdm),
      type: win.type,
      timestamp: win.createdAt,
      txHash: win.txHash,
    }));

    return NextResponse.json({
      data: { feed, count: feed.length },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

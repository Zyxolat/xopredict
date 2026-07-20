/**
 * GET /api/share-win - Generate shareable win content
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const roundId = req.nextUrl.searchParams.get("roundId");
    const format = req.nextUrl.searchParams.get("format") || "json"; // json, png-data

    if (!roundId) {
      return NextResponse.json({ error: "Round ID required" }, { status: 400 });
    }

    const round = await prisma.round.findUnique({
      where: { id: roundId },
    });

    if (!round) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }

    if (!round.winnerAddress || !round.potUsdm) {
      return NextResponse.json(
        { error: "No winner data" },
        { status: 400 }
      );
    }

    const amount = Number(round.potUsdm).toFixed(2);
    const text = `I won ${amount} USDm on XOLAT 🎮\nPlay now: https://xolat.game`;

    // For Twitter/Farcaster/Telegram sharing
    const shareData = {
      text,
      winner: round.winnerAddress,
      amount,
      roundId,
      timestamp: round.createdAt.toISOString(),
      shareUrls: {
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=https://xolat.game?round=${roundId}`,
        farcaster: text,
        telegram: `https://t.me/share/url?url=https://xolat.game?round=${roundId}&text=${encodeURIComponent(text)}`,
      },
    };

    if (format === "png-data") {
      // Return data for frontend PNG generation
      return NextResponse.json({
        data: {
          ...shareData,
          imageData: {
            width: 1200,
            height: 630,
            backgroundColor: "#0a0e27",
            text: `I won ${amount} USDm on XOLAT`,
            subText: "Play now at xopredict.game",
            badge: "⚡ XOPREDICT",
          },
        },
      });
    }

    return NextResponse.json({ data: shareData });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

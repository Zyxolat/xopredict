/**
 * GET /api/verify - Verify seed reveal and round fairness
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySeedReveal } from "@/lib/gamification";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const roundId = req.nextUrl.searchParams.get("roundId");

    if (!roundId) {
      return NextResponse.json({ error: "Round ID required" }, { status: 400 });
    }

    // Get round details
    const round = await prisma.round.findUnique({
      where: { id: roundId },
      include: { picks: true },
    });

    if (!round) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }

    if (!round.serverSeed || !round.clientSeed || round.nonce === null) {
      return NextResponse.json(
        { error: "Seeds not yet revealed" },
        { status: 400 }
      );
    }

    // Verify seeds
    const computedNumbers = verifySeedReveal(
      round.serverSeed,
      round.clientSeed,
      round.nonce
    );

    const isValid =
      JSON.stringify(computedNumbers) === JSON.stringify(round.numbers);

    // Calculate winner based on verified seeds
    let winnerAddress: string | null = null;
    if (round.type === "arena") {
      // In arena: highest card index wins
      const picks = round.picks;
      if (picks.length > 0) {
        picks.sort((a, b) => {
          const aCard = a.cardIndex;
          const bCard = b.cardIndex;
          return computedNumbers[bCard] - computedNumbers[aCard];
        });
        winnerAddress = picks[0].playerAddress;
      }
    } else if (round.type === "solo") {
      // In solo: match card index to highest value
      const pick = round.picks[0];
      if (pick && computedNumbers[pick.cardIndex] >= computedNumbers[1 - pick.cardIndex]) {
        winnerAddress = pick.playerAddress;
      }
    }

    return NextResponse.json({
      data: {
        roundId: round.id,
        type: round.type,
        serverSeed: round.serverSeed,
        clientSeed: round.clientSeed,
        nonce: round.nonce,
        vrfRandom: round.vrfRandom,
        computedNumbers,
        storedNumbers: round.numbers,
        isValid,
        winnerAddress,
        picks: round.picks.map((p) => ({
          playerAddress: p.playerAddress,
          cardIndex: p.cardIndex,
          value: p.value,
        })),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

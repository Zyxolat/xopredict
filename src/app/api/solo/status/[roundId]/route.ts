import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processKeeperJob } from "@/lib/keeper/processor";
import { getStageDescription } from "@/lib/keeper/types";
import { publicClient } from "@/lib/keeper/wallet";
import { xolatAbi, xolatAddress } from "@/lib/contracts";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { roundId: string } }
) {
  try {
    const roundIdStr = params.roundId;
    if (!roundIdStr || isNaN(Number(roundIdStr))) {
      return NextResponse.json({ error: "Invalid roundId" }, { status: 400 });
    }

    const roundId = BigInt(roundIdStr);

    let job = await prisma.keeperJob.findUnique({
      where: { roundId },
    });

    if (!job) {
      return NextResponse.json(
        { error: "No keeper job found for this roundId" },
        { status: 404 }
      );
    }

    // If job is in PENDING state, trigger processing step
    if (job.status === "PENDING" && job.stage !== "COMPLETED" && job.stage !== "FAILED" && job.stage !== "REFUNDED") {
      void processKeeperJob(roundId).catch((err) => {
        console.error(`[API Keeper Status] Error advancing job #${roundIdStr}:`, err);
      });
      // Refresh job state after trigger attempt
      job = (await prisma.keeperJob.findUnique({ where: { roundId } })) || job;
    }

    const message = getStageDescription(job.stage, job.status);

    // Once the round is settled on-chain, fetch the real result (card values,
    // which card the player picked, winner, payout) so the frontend can show
    // the actual outcome instead of guessing/faking it.
    let result: {
      numbers: string[];
      selectedCard: number;
      winnerAddress: string;
      potUsdm: string;
      won: boolean;
    } | null = null;

    if (job.stage === "COMPLETED" && job.status === "COMPLETED" && xolatAddress) {
      try {
        const roundData = (await publicClient.readContract({
          address: xolatAddress,
          abi: xolatAbi,
          functionName: "getRound",
          args: [roundId],
        })) as unknown as readonly [
          bigint, string, `0x${string}`, bigint, `0x${string}`, string, string,
          bigint, `0x${string}`, readonly bigint[], `0x${string}`, bigint, string,
          number, string, bigint
        ];

        const numbers = roundData[9];
        const winnerAddress = roundData[10];
        const potUsdm = roundData[11];
        const selectedCard = roundData[13];

        result = {
          numbers: numbers.map((n) => n.toString()),
          selectedCard,
          winnerAddress,
          potUsdm: potUsdm.toString(),
          won: winnerAddress.toLowerCase() === roundData[2].toLowerCase(),
        };
      } catch (err) {
        console.error(`[API Keeper Status] Could not read on-chain result for round #${roundIdStr}:`, err);
      }
    }

    return NextResponse.json({
      ok: true,
      roundId: (job.roundId ?? roundId).toString(),
      stage: job.stage,
      status: job.status,
      requestBlock: job.requestBlock?.toString() || null,
      requestTxHash: job.requestTxHash || null,
      fetchTxHash: job.fetchTxHash || null,
      settleTxHash: job.settleTxHash || null,
      retryCount: job.retryCount,
      lastError: job.lastError || null,
      message,
      result,
      updatedAt: job.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error("[API Keeper Status] Internal error:", errMessage);
    return NextResponse.json({ error: "Internal status query error" }, { status: 500 });
  }
}

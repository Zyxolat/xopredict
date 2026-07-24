import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processKeeperJob } from "@/lib/keeper/processor";
import { getStageDescription } from "@/lib/keeper/types";

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

    return NextResponse.json({
      ok: true,
      roundId: job.roundId.toString(),
      stage: job.stage,
      status: job.status,
      requestBlock: job.requestBlock?.toString() || null,
      requestTxHash: job.requestTxHash || null,
      fetchTxHash: job.fetchTxHash || null,
      settleTxHash: job.settleTxHash || null,
      retryCount: job.retryCount,
      lastError: job.lastError || null,
      message,
      updatedAt: job.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error("[API Keeper Status] Internal error:", errMessage);
    return NextResponse.json({ error: "Internal status query error" }, { status: 500 });
  }
}

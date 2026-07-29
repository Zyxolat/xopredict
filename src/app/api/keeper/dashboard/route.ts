import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    if (!prisma.keeperJob) {
      return NextResponse.json({
        ok: true,
        queuedJobs: 0,
        runningJobs: 0,
        failedJobs: 0,
        completedJobs: 0,
        jobs: [],
      });
    }

    const [queuedJobs, runningJobs, failedJobs, completedJobs, recentJobs] = await Promise.all([
      prisma.keeperJob.count({ where: { status: "PENDING" } }),
      prisma.keeperJob.count({ where: { status: "PROCESSING" } }),
      prisma.keeperJob.count({ where: { status: "FAILED" } }),
      prisma.keeperJob.count({ where: { status: "COMPLETED" } }),
      prisma.keeperJob.findMany({
        orderBy: { updatedAt: "desc" },
        take: 20,
      }),
    ]);

    const serializedJobs = JSON.parse(
      JSON.stringify(recentJobs, (_, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      metrics: {
        queuedJobs,
        runningJobs,
        failedJobs,
        completedJobs,
        totalJobs: queuedJobs + runningJobs + failedJobs + completedJobs,
      },
      jobs: serializedJobs,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error("[API Keeper Dashboard] Error:", errMessage);
    return NextResponse.json({ error: "Internal dashboard query error" }, { status: 500 });
  }
}

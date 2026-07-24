import { formatEther } from "viem";
import { prisma } from "@/lib/prisma";
import { publicClient, getRelayerAccount } from "@/lib/keeper/wallet";

export const dynamic = "force-dynamic";

export async function GET() {
  const memoryUsage = process.memoryUsage();
  const uptimeSeconds = process.uptime();

  let celoBalance = "0";
  const account = getRelayerAccount();
  if (account) {
    try {
      const rawBal = await publicClient.getBalance({ address: account.address });
      celoBalance = formatEther(rawBal);
    } catch {
      // Fallback
    }
  }

  let totalArenas = 0;
  let openArenas = 0;
  let fullArenas = 0;
  let settledArenas = 0;

  let totalRounds = 0;
  let completedRounds = 0;

  let pendingJobs = 0;
  let processingJobs = 0;
  let failedJobs = 0;
  let completedJobs = 0;

  try {
    if (prisma.arena) {
      [totalArenas, openArenas, fullArenas, settledArenas] = await Promise.all([
        prisma.arena.count(),
        prisma.arena.count({ where: { status: "OPEN" } }),
        prisma.arena.count({ where: { status: "FULL" } }),
        prisma.arena.count({ where: { status: "SETTLED" } }),
      ]);
    }

    if (prisma.round) {
      [totalRounds, completedRounds] = await Promise.all([
        prisma.round.count(),
        prisma.round.count({ where: { status: "completed" } }),
      ]);
    }

    if (prisma.keeperJob) {
      [pendingJobs, processingJobs, failedJobs, completedJobs] = await Promise.all([
        prisma.keeperJob.count({ where: { status: "PENDING" } }),
        prisma.keeperJob.count({ where: { status: "PROCESSING" } }),
        prisma.keeperJob.count({ where: { status: "FAILED" } }),
        prisma.keeperJob.count({ where: { status: "COMPLETED" } }),
      ]);
    }
  } catch {
    // Graceful fallback
  }

  const lines = [
    "# HELP xopredict_uptime_seconds Process uptime in seconds",
    "# TYPE xopredict_uptime_seconds gauge",
    `xopredict_uptime_seconds ${uptimeSeconds.toFixed(2)}`,
    "",
    "# HELP xopredict_memory_heap_bytes Memory heap usage in bytes",
    "# TYPE xopredict_memory_heap_bytes gauge",
    `xopredict_memory_heap_bytes{type="used"} ${memoryUsage.heapUsed}`,
    `xopredict_memory_heap_bytes{type="total"} ${memoryUsage.heapTotal}`,
    `xopredict_memory_heap_bytes{type="rss"} ${memoryUsage.rss}`,
    "",
    "# HELP xopredict_relayer_celo_balance Native CELO balance of the relayer wallet",
    "# TYPE xopredict_relayer_celo_balance gauge",
    `xopredict_relayer_celo_balance ${celoBalance}`,
    "",
    "# HELP xopredict_arenas_total Total arenas created by status",
    "# TYPE xopredict_arenas_total gauge",
    `xopredict_arenas_total{status="all"} ${totalArenas}`,
    `xopredict_arenas_total{status="open"} ${openArenas}`,
    `xopredict_arenas_total{status="full"} ${fullArenas}`,
    `xopredict_arenas_total{status="settled"} ${settledArenas}`,
    "",
    "# HELP xopredict_rounds_total Total game rounds",
    "# TYPE xopredict_rounds_total gauge",
    `xopredict_rounds_total{status="all"} ${totalRounds}`,
    `xopredict_rounds_total{status="completed"} ${completedRounds}`,
    "",
    "# HELP xopredict_keeper_jobs Total keeper jobs by status",
    "# TYPE xopredict_keeper_jobs gauge",
    `xopredict_keeper_jobs{status="pending"} ${pendingJobs}`,
    `xopredict_keeper_jobs{status="processing"} ${processingJobs}`,
    `xopredict_keeper_jobs{status="failed"} ${failedJobs}`,
    `xopredict_keeper_jobs{status="completed"} ${completedJobs}`,
    "",
  ];

  return new Response(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
    },
  });
}

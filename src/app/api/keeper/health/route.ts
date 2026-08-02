import { NextResponse } from "next/server";
import { formatEther } from "viem";
import { prisma } from "@/lib/prisma";
import { publicClient, getRelayerHealth } from "@/lib/keeper/wallet";
import { xolatAbi, xolatAddress } from "@/lib/contracts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const startTime = Date.now();

  // Sensitive operational details (relayer address/balance, contract address,
  // treasury balance, RPC endpoint, git SHA) are only included when the caller
  // presents the shared ops secret. Docker/Railway health checks only inspect
  // the HTTP status code, so gating these fields does not break them.
  const configuredSecret = process.env.KEEPER_HEALTH_SECRET;
  const providedSecret = request.headers.get("x-keeper-secret");
  const includeSensitive = Boolean(configuredSecret) && providedSecret === configuredSecret;

  let dbOk = false;
  let dbLatencyMs = 0;
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  let celoRpcOk = false;
  let currentBlock: string | null = null;
  try {
    const blockNum = await publicClient.getBlockNumber();
    currentBlock = blockNum.toString();
    celoRpcOk = true;
  } catch {
    celoRpcOk = false;
  }

  let contractOk = false;
  let arenaCountStr = "0";
  let roundCountStr = "0";
  let usdmTreasuryBalance = "0";
  try {
    if (xolatAddress) {
      const [arenaCount, roundCount, usdmAddress] = await Promise.all([
        publicClient.readContract({ address: xolatAddress, abi: xolatAbi, functionName: "arenaCount" }),
        publicClient.readContract({ address: xolatAddress, abi: xolatAbi, functionName: "roundCount" }),
        publicClient.readContract({ address: xolatAddress, abi: xolatAbi, functionName: "usdm" }),
      ]);

      arenaCountStr = BigInt(arenaCount ?? 0).toString();
      roundCountStr = BigInt(roundCount ?? 0).toString();

      if (usdmAddress) {
        const rawUsdmBalance = await publicClient.readContract({
          address: usdmAddress as `0x${string}`,
          abi: [
            {
              inputs: [{ name: "account", type: "address" }],
              name: "balanceOf",
              outputs: [{ name: "", type: "uint256" }],
              stateMutability: "view",
              type: "function",
            },
          ] as const,
          functionName: "balanceOf",
          args: [xolatAddress],
        });
        usdmTreasuryBalance = formatEther(rawUsdmBalance as bigint);
      }

      contractOk = true;
    }
  } catch {
    contractOk = false;
  }

  const relayerHealth = await getRelayerHealth();

  let activeArenaJobs = 0;
  let activeSoloJobs = 0;
  let failedJobs = 0;
  let queueSize = 0;

  try {
    if (prisma.keeperJob) {
      const [activeArena, activeSolo, failedCount, totalQueue] = await Promise.all([
        prisma.keeperJob.count({ where: { type: "ARENA", status: { in: ["PENDING", "PROCESSING"] } } }),
        prisma.keeperJob.count({ where: { type: "SOLO", status: { in: ["PENDING", "PROCESSING"] } } }),
        prisma.keeperJob.count({ where: { status: "FAILED" } }),
        prisma.keeperJob.count({ where: { status: { in: ["PENDING", "PROCESSING"] } } }),
      ]);

      activeArenaJobs = activeArena;
      activeSoloJobs = activeSolo;
      failedJobs = failedCount;
      queueSize = totalQueue;
    }
  } catch {
    // Graceful fallback if database unavailable
  }

  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  const uptimeSeconds = Math.floor(process.uptime());

  const overallOk = dbOk && celoRpcOk && relayerHealth.configured && !relayerHealth.isBalanceLow;
  const statusString = overallOk ? "healthy" : dbOk && celoRpcOk ? "degraded" : "unhealthy";
  const httpStatusCode = overallOk || (dbOk && celoRpcOk) ? 200 : 503;

  return NextResponse.json(
    {
      status: statusString,
      ok: overallOk,
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startTime,
      environment: process.env.NODE_ENV || "development",
      nodeVersion: process.version,
      applicationVersion: "0.1.0",
      gitCommit: includeSensitive
        ? process.env.RAILWAY_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || "main"
        : undefined,
      uptimeSeconds,
      components: {
        database: {
          ok: dbOk,
          latencyMs: dbLatencyMs,
          engine: "Prisma PostgreSQL",
        },
        celoRpc: {
          ok: celoRpcOk,
          currentBlock: includeSensitive ? currentBlock : undefined,
          endpoint: includeSensitive
            ? process.env.NEXT_PUBLIC_CELO_RPC_URL || "https://forno.celo.org"
            : undefined,
        },
        witnet: {
          ok: celoRpcOk,
          timeoutSeconds: 1200,
        },
        smartContract: {
          ok: contractOk,
          address: includeSensitive ? xolatAddress || null : undefined,
          arenaCount: includeSensitive ? arenaCountStr : undefined,
          roundCount: includeSensitive ? roundCountStr : undefined,
          usdmTreasuryBalance: includeSensitive ? usdmTreasuryBalance : undefined,
        },
        keeperWorker: {
          ok: relayerHealth.configured,
          status: queueSize > 0 ? "active" : "idle",
          queueSize,
          activeArenaJobs,
          activeSoloJobs,
          failedJobs,
        },
        relayerWallet: {
          configured: relayerHealth.configured,
          address: includeSensitive ? relayerHealth.address : undefined,
          balanceCelo: includeSensitive ? relayerHealth.balanceCelo : undefined,
          isBalanceLow: relayerHealth.isBalanceLow,
          thresholdCelo: "1.0",
        },
      },
      system: {
        memory: {
          rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
          heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          externalMb: Math.round(memoryUsage.external / 1024 / 1024),
        },
        cpu: {
          userMicros: cpuUsage.user,
          systemMicros: cpuUsage.system,
        },
      },
    },
    { status: httpStatusCode }
  );
}

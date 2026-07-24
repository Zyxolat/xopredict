import { parseEventLogs } from "viem";
import { prisma } from "@/lib/prisma";
import { publicClient, getRelayerAccount, getRelayerWalletClient, checkRelayerBalance } from "@/lib/keeper/wallet";
import { xolatAbi, xolatAddress } from "@/lib/contracts";

const MAX_RETRIES = 5;
const LOCK_TIMEOUT_MS = 60_000; // 60 seconds lock timeout for crashed workers
const BACKOFF_SCHEDULE_MS = [5_000, 15_000, 45_000, 120_000, 300_000]; // 5s, 15s, 45s, 2m, 5m

const witnetAbi = [
  {
    inputs: [{ name: "gasPrice", type: "uint256" }],
    name: "estimateRandomizeFee",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "requestBlock", type: "uint256" }],
    name: "isRandomized",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export async function processKeeperJob(roundIdInput: bigint | string) {
  const roundId = typeof roundIdInput === "string" ? BigInt(roundIdInput) : roundIdInput;
  const walletClient = getRelayerWalletClient();
  const account = getRelayerAccount();

  if (!xolatAddress || !walletClient || !account) {
    console.warn(`[Keeper Processor] Skipping round #${roundId.toString()} - relayer wallet or contract address not configured.`);
    return { success: false, reason: "Relayer environment not configured" };
  }

  // Periodic relayer wallet CELO balance check & warning log
  void checkRelayerBalance().catch(() => {});

  // Find job
  let job = await prisma.keeperJob.findUnique({ where: { roundId } });
  if (!job) {
    console.warn(`[Keeper Processor] No keeper job found for round #${roundId.toString()}`);
    return { success: false, reason: "Job not found" };
  }

  if (job.status === "COMPLETED" || job.stage === "COMPLETED" || job.stage === "REFUNDED") {
    return { success: true, stage: job.stage, status: job.status };
  }

  const now = new Date();

  // ── EXPONENTIAL RETRY BACKOFF CHECK ───────────────────────────────────────
  if (job.nextRetryAt && now < new Date(job.nextRetryAt)) {
    const remainingMs = new Date(job.nextRetryAt).getTime() - now.getTime();
    console.log(`[Keeper Processor] Round #${roundId.toString()} in backoff. Waiting ${(remainingMs / 1000).toFixed(1)}s before retry #${job.retryCount + 1}`);
    return { success: false, reason: "Waiting for exponential retry backoff" };
  }

  // ── ATOMIC CONCURRENCY LOCKING ──────────────────────────────────────────────
  // Atomically claim lock using updateMany with conditional state & stale lock check
  const staleLockTime = new Date(now.getTime() - LOCK_TIMEOUT_MS);
  const lockClaimResult = await prisma.keeperJob.updateMany({
    where: {
      roundId,
      status: { notIn: ["COMPLETED", "FAILED"] },
      OR: [
        { lockedAt: null },
        { lockedAt: { lt: staleLockTime } },
      ],
    },
    data: {
      status: "PROCESSING",
      lockedAt: now,
    },
  });

  if (lockClaimResult.count === 0) {
    return { success: false, reason: "Job is locked by another worker or already finalized" };
  }

  // Re-fetch job with updated status
  job = (await prisma.keeperJob.findUnique({ where: { roundId } })) || job;

  try {
    // ── STAGE 1: REQUEST_RANDOMNESS ─────────────────────────────────────────
    if (job.stage === "REQUEST_RANDOMNESS") {
      console.log(`[Keeper Processor] Stage 1: Requesting randomness for round #${roundId.toString()}`);

      // Read current gas price and estimate Witnet fee
      const gasPrice = await publicClient.getGasPrice();
      
      // Get Witnet contract address from Xolat contract
      const witnetAddress = await publicClient.readContract({
        address: xolatAddress,
        abi: xolatAbi,
        functionName: "witnet",
      }) as `0x${string}`;

      const celoPaid = await publicClient.readContract({
        address: witnetAddress,
        abi: witnetAbi,
        functionName: "estimateRandomizeFee",
        args: [gasPrice],
      });

      // Submit requestRandomness(roundId) on-chain
      const requestTxHash = await walletClient.writeContract({
        address: xolatAddress,
        abi: xolatAbi,
        functionName: "requestRandomness",
        args: [roundId],
        value: celoPaid,
        account,
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: requestTxHash,
        confirmations: 1,
      });

      // Parse RandomnessRequested log to extract requestBlock
      let requestBlock: bigint | null = null;
      try {
        const logs = parseEventLogs({
          abi: xolatAbi,
          eventName: "RandomnessRequested",
          logs: receipt.logs,
        });
        if (logs.length > 0) {
          const logArgs = (logs[0] as unknown as { args?: { requestBlock?: bigint } })?.args;
          if (logArgs?.requestBlock) {
            requestBlock = logArgs.requestBlock;
          }
        }
      } catch (logErr) {
        console.warn("[Keeper Processor] Could not parse RandomnessRequested event log:", logErr);
      }

      job = await prisma.keeperJob.update({
        where: { roundId },
        data: {
          stage: "AWAIT_WITNET",
          status: "PENDING",
          requestTxHash,
          requestBlock: requestBlock ?? receipt.blockNumber,
          celoPaid: celoPaid.toString(),
          lockedAt: null,
          nextRetryAt: null,
        },
      });
    }

    // ── STAGE 2: AWAIT_WITNET ────────────────────────────────────────────────
    if (job.stage === "AWAIT_WITNET") {
      console.log(`[Keeper Processor] Stage 2: Checking Witnet oracle status for round #${roundId.toString()}`);

      const witnetAddress = await publicClient.readContract({
        address: xolatAddress,
        abi: xolatAbi,
        functionName: "witnet",
      }) as `0x${string}`;

      const reqBlock = job.requestBlock ?? 0n;
      const isRandomized = await publicClient.readContract({
        address: witnetAddress,
        abi: witnetAbi,
        functionName: "isRandomized",
        args: [reqBlock],
      });

      if (isRandomized) {
        job = await prisma.keeperJob.update({
          where: { roundId },
          data: {
            stage: "FETCH_RANDOMNESS",
            status: "PENDING",
            lockedAt: null,
            nextRetryAt: null,
          },
        });
      } else {
        // Check 20 minute timeout
        const jobAgeMs = now.getTime() - new Date(job.createdAt).getTime();
        if (jobAgeMs > 20 * 60 * 1000) {
          console.warn(`[Keeper Processor] Witnet timeout reached for round #${roundId.toString()}. Executing checkRandomnessTimeout.`);
          const timeoutTxHash = await walletClient.writeContract({
            address: xolatAddress,
            abi: xolatAbi,
            functionName: "checkRandomnessTimeout",
            args: [roundId],
            account,
          });

          await publicClient.waitForTransactionReceipt({ hash: timeoutTxHash, confirmations: 1 });

          job = await prisma.keeperJob.update({
            where: { roundId },
            data: {
              stage: "REFUNDED",
              status: "COMPLETED",
              lockedAt: null,
              nextRetryAt: null,
            },
          });
          return { success: true, stage: "REFUNDED", status: "COMPLETED" };
        }

        // Witnet is still processing - release lock for next poll
        await prisma.keeperJob.update({
          where: { roundId },
          data: { status: "PENDING", lockedAt: null, nextRetryAt: null },
        });
        return { success: true, stage: "AWAIT_WITNET", status: "PENDING" };
      }
    }

    // ── STAGE 3: FETCH_RANDOMNESS (WITH EXTERNAL AWARENESS) ──────────────────
    if (job.stage === "FETCH_RANDOMNESS") {
      console.log(`[Keeper Processor] Stage 3: Checking on-chain status before fetchRandomness for round #${roundId.toString()}`);

      // Read on-chain round status first to handle external transactions
      const onChainRoundCheck = (await publicClient.readContract({
        address: xolatAddress,
        abi: xolatAbi,
        functionName: "getRound",
        args: [roundId],
      })) as unknown as readonly [
        bigint, string, `0x${string}`, bigint, `0x${string}`, string, string, bigint, `0x${string}`, readonly bigint[], `0x${string}`, bigint, string, number, string, bigint
      ];

      const onChainStatus = onChainRoundCheck[14]; // Index 14 = status string

      if (onChainStatus === "revealed" || onChainStatus === "completed") {
        console.log(`[Keeper Processor] External Awareness: Round #${roundId.toString()} is already "${onChainStatus}" on-chain. Skipping fetchRandomness transaction.`);
        job = await prisma.keeperJob.update({
          where: { roundId },
          data: {
            stage: onChainStatus === "completed" ? "SETTLE_ROUND" : "SETTLE_ROUND",
            status: "PENDING",
            lockedAt: null,
            nextRetryAt: null,
          },
        });
      } else {
        const fetchTxHash = await walletClient.writeContract({
          address: xolatAddress,
          abi: xolatAbi,
          functionName: "fetchRandomness",
          args: [roundId],
          account,
        });

        await publicClient.waitForTransactionReceipt({
          hash: fetchTxHash,
          confirmations: 1,
        });

        job = await prisma.keeperJob.update({
          where: { roundId },
          data: {
            stage: "SETTLE_ROUND",
            status: "PENDING",
            fetchTxHash,
            lockedAt: null,
            nextRetryAt: null,
          },
        });
      }
    }

    // ── STAGE 4: SETTLE_ROUND (WITH EXTERNAL AWARENESS & SYNC) ───────────────
    if (job.stage === "SETTLE_ROUND") {
      console.log(`[Keeper Processor] Stage 4: Checking on-chain status before settleRound for round #${roundId.toString()}`);

      let settleTxHash: string | undefined = job.settleTxHash || undefined;

      // Read on-chain round status first to handle external transactions
      const onChainRoundRaw = (await publicClient.readContract({
        address: xolatAddress,
        abi: xolatAbi,
        functionName: "getRound",
        args: [roundId],
      })) as unknown as readonly [
        roundId: bigint,
        roundType: string,
        player: `0x${string}`,
        arenaId: bigint,
        commitHash: `0x${string}`,
        serverSeed: string,
        clientSeed: string,
        nonce: bigint,
        randomness: `0x${string}`,
        numbers: readonly bigint[],
        winnerAddress: `0x${string}`,
        potUsdm: bigint,
        txHash: string,
        selectedCard: number,
        status: string,
        createdAt: bigint
      ];

      const onChainStatus = onChainRoundRaw[14];

      if (onChainStatus === "completed") {
        console.log(`[Keeper Processor] External Awareness: Round #${roundId.toString()} is already "completed" on-chain. Skipping settleRound transaction and synchronizing DB.`);
      } else {
        settleTxHash = await walletClient.writeContract({
          address: xolatAddress,
          abi: xolatAbi,
          functionName: "settleRound",
          args: [roundId],
          account,
        });

        await publicClient.waitForTransactionReceipt({
          hash: settleTxHash as `0x${string}`,
          confirmations: 1,
        });
      }

      const onChainRound = {
        randomness: onChainRoundRaw[8],
        winnerAddress: onChainRoundRaw[10],
        potUsdm: onChainRoundRaw[11],
        selectedCard: onChainRoundRaw[13],
        status: onChainRoundRaw[14],
      };

      const finalTxHash = settleTxHash || job.settleTxHash || "0x0";

      // Synchronize database records
      await prisma.round.upsert({
        where: { roundId },
        update: {
          status: "completed",
          winnerAddress: onChainRound.winnerAddress,
          vrfRandom: onChainRound.randomness,
          txHash: finalTxHash,
        },
        create: {
          roundId,
          type: "solo",
          commitHash: onChainRound.randomness || "0x0",
          winnerAddress: onChainRound.winnerAddress,
          vrfRandom: onChainRound.randomness,
          status: "completed",
          potUsdm: (Number(onChainRound.potUsdm) / 1e18).toString(),
          txHash: finalTxHash,
        },
      });

      // Update Player totalWonUsdm stats
      if (onChainRound.winnerAddress && onChainRound.winnerAddress.startsWith("0x")) {
        const winningPlayer = await prisma.player.findFirst({
          where: { address: { equals: onChainRound.winnerAddress, mode: "insensitive" } },
        });
        if (winningPlayer) {
          const payoutAmount = (Number(onChainRound.potUsdm) * 1.95) / 1e18;
          await prisma.player.update({
            where: { id: winningPlayer.id },
            data: {
              totalWonUsdm: { increment: payoutAmount },
            },
          });
        }
      }

      job = await prisma.keeperJob.update({
        where: { roundId },
        data: {
          stage: "COMPLETED",
          status: "COMPLETED",
          settleTxHash: finalTxHash,
          lockedAt: null,
          nextRetryAt: null,
        },
      });

      console.log(`[Keeper Processor] Round #${roundId.toString()} successfully synchronized & finalized! Winner: ${onChainRound.winnerAddress}`);
      return { success: true, stage: "COMPLETED", status: "COMPLETED" };
    }

    return { success: true, stage: job.stage, status: job.status };
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Keeper Processor] Error processing round #${roundId.toString()} at stage ${job.stage}:`, errMessage);

    const nextRetryCount = job.retryCount + 1;
    const isFailed = nextRetryCount >= MAX_RETRIES;

    // Calculate exponential retry backoff delay (5s, 15s, 45s, 2m, 5m)
    const delayMs = BACKOFF_SCHEDULE_MS[Math.min(nextRetryCount - 1, BACKOFF_SCHEDULE_MS.length - 1)];
    const nextRetryAt = isFailed ? null : new Date(Date.now() + delayMs);

    await prisma.keeperJob.update({
      where: { roundId },
      data: {
        status: isFailed ? "FAILED" : "PENDING",
        stage: isFailed ? "FAILED" : job.stage,
        retryCount: nextRetryCount,
        lastError: errMessage,
        nextRetryAt,
        lockedAt: null,
      },
    });

    console.log(`[Keeper Processor] Scheduled retry #${nextRetryCount} for round #${roundId.toString()} in ${(delayMs / 1000).toFixed(0)}s`);

    return { success: false, error: errMessage, retryCount: nextRetryCount };
  }
}

/**
 * Worker loop: Process all pending/unfinished keeper jobs
 */
export async function processPendingJobs() {
  try {
    const pendingJobs = await prisma.keeperJob.findMany({
      where: {
        status: { in: ["PENDING", "PROCESSING"] },
        stage: { notIn: ["COMPLETED", "FAILED", "REFUNDED"] },
      },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    for (const job of pendingJobs) {
      await processKeeperJob(job.roundId);
    }
  } catch (error) {
    console.error("[Keeper Processor Worker] Error polling pending jobs:", error);
  }
}

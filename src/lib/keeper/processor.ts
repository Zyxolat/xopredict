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

type OnChainRoundTuple = readonly [
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

type OnChainArenaTuple = readonly [
  arenaId: bigint,
  betAmount: bigint,
  maxPlayers: number,
  playerCount: number,
  settled: boolean,
  winner: `0x${string}`,
  createdAt: bigint,
  players: readonly `0x${string}`[],
  status: number
];

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE ON-CHAIN TRANSACTION HELPERS (DRY)
// ─────────────────────────────────────────────────────────────────────────────

async function requestRandomnessOnChain(roundId: bigint) {
  const walletClient = getRelayerWalletClient();
  const account = getRelayerAccount();
  if (!xolatAddress || !walletClient || !account) {
    throw new Error("Relayer environment not configured");
  }

  const gasPrice = await publicClient.getGasPrice();
  const witnetAddress = (await publicClient.readContract({
    address: xolatAddress,
    abi: xolatAbi,
    functionName: "witnet",
  })) as `0x${string}`;

  const celoPaid = await publicClient.readContract({
    address: witnetAddress,
    abi: witnetAbi,
    functionName: "estimateRandomizeFee",
    args: [gasPrice],
  });

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

  return {
    requestTxHash,
    requestBlock: requestBlock ?? receipt.blockNumber,
    celoPaid,
  };
}

async function checkWitnetStatus(requestBlock: bigint, createdAt: Date, roundId: bigint) {
  const walletClient = getRelayerWalletClient();
  const account = getRelayerAccount();
  if (!xolatAddress) {
    throw new Error("Xolat contract address not configured");
  }

  const witnetAddress = (await publicClient.readContract({
    address: xolatAddress,
    abi: xolatAbi,
    functionName: "witnet",
  })) as `0x${string}`;

  const isRandomized = await publicClient.readContract({
    address: witnetAddress,
    abi: witnetAbi,
    functionName: "isRandomized",
    args: [requestBlock],
  });

  if (isRandomized) {
    return { isRandomized: true, isTimeout: false };
  }

  // Check 20 minute timeout
  const jobAgeMs = Date.now() - createdAt.getTime();
  if (jobAgeMs > 20 * 60 * 1000 && walletClient && account) {
    console.warn(`[Keeper Processor] Witnet timeout reached for round #${roundId.toString()}. Executing checkRandomnessTimeout.`);
    const timeoutTxHash = await walletClient.writeContract({
      address: xolatAddress,
      abi: xolatAbi,
      functionName: "checkRandomnessTimeout",
      args: [roundId],
      account,
    });

    await publicClient.waitForTransactionReceipt({ hash: timeoutTxHash, confirmations: 1 });
    return { isRandomized: false, isTimeout: true };
  }

  return { isRandomized: false, isTimeout: false };
}

async function fetchRandomnessOnChain(roundId: bigint) {
  const walletClient = getRelayerWalletClient();
  const account = getRelayerAccount();
  if (!xolatAddress || !walletClient || !account) {
    throw new Error("Relayer environment not configured");
  }

  const onChainRoundCheck = (await publicClient.readContract({
    address: xolatAddress,
    abi: xolatAbi,
    functionName: "getRound",
    args: [roundId],
  })) as unknown as OnChainRoundTuple;

  const onChainStatus = onChainRoundCheck[14];

  if (onChainStatus === "revealed" || onChainStatus === "completed") {
    console.log(`[Keeper Processor] Round #${roundId.toString()} is already "${onChainStatus}" on-chain. Skipping fetchRandomness transaction.`);
    return { fetchTxHash: null, skipped: true };
  }

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

  return { fetchTxHash, skipped: false };
}

async function settleRoundOnChain(roundId: bigint) {
  const walletClient = getRelayerWalletClient();
  const account = getRelayerAccount();
  if (!xolatAddress || !walletClient || !account) {
    throw new Error("Relayer environment not configured");
  }

  let settleTxHash: string | undefined;

  const onChainRoundRaw = (await publicClient.readContract({
    address: xolatAddress,
    abi: xolatAbi,
    functionName: "getRound",
    args: [roundId],
  })) as unknown as OnChainRoundTuple;

  const onChainStatus = onChainRoundRaw[14];

  if (onChainStatus === "completed") {
    console.log(`[Keeper Processor] Round #${roundId.toString()} is already "completed" on-chain. Skipping settleRound transaction.`);
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

  const finalRoundRaw = (await publicClient.readContract({
    address: xolatAddress,
    abi: xolatAbi,
    functionName: "getRound",
    args: [roundId],
  })) as unknown as OnChainRoundTuple;

  return {
    settleTxHash,
    onChainRound: {
      randomness: finalRoundRaw[8],
      winnerAddress: finalRoundRaw[10],
      potUsdm: finalRoundRaw[11],
      selectedCard: finalRoundRaw[13],
      status: finalRoundRaw[14],
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SOLO KEEPER PROCESSOR
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function processSoloJob(job: any) {
  const roundId = job.roundId;
  if (!roundId) {
    throw new Error("Solo job missing roundId");
  }

  // STAGE 1: REQUEST_RANDOMNESS
  if (job.stage === "REQUEST_RANDOMNESS") {
    console.log(`[Keeper Solo Processor] Stage 1: Requesting randomness for round #${roundId.toString()}`);
    const { requestTxHash, requestBlock, celoPaid } = await requestRandomnessOnChain(roundId);

    job = await prisma.keeperJob.update({
      where: { id: job.id },
      data: {
        stage: "AWAIT_WITNET",
        status: "PENDING",
        requestTxHash,
        requestBlock,
        celoPaid: celoPaid.toString(),
        lockedAt: null,
        nextRetryAt: null,
      },
    });
  }

  // STAGE 2: AWAIT_WITNET
  if (job.stage === "AWAIT_WITNET") {
    console.log(`[Keeper Solo Processor] Stage 2: Checking Witnet oracle status for round #${roundId.toString()}`);
    const reqBlock = job.requestBlock ?? 0n;
    const { isRandomized, isTimeout } = await checkWitnetStatus(reqBlock, new Date(job.createdAt), roundId);

    if (isTimeout) {
      job = await prisma.keeperJob.update({
        where: { id: job.id },
        data: {
          stage: "REFUNDED",
          status: "COMPLETED",
          lockedAt: null,
          nextRetryAt: null,
        },
      });
      return { success: true, stage: "REFUNDED", status: "COMPLETED" };
    }

    if (isRandomized) {
      job = await prisma.keeperJob.update({
        where: { id: job.id },
        data: {
          stage: "FETCH_RANDOMNESS",
          status: "PENDING",
          lockedAt: null,
          nextRetryAt: null,
        },
      });
    } else {
      await prisma.keeperJob.update({
        where: { id: job.id },
        data: { status: "PENDING", lockedAt: null, nextRetryAt: null },
      });
      return { success: true, stage: "AWAIT_WITNET", status: "PENDING" };
    }
  }

  // STAGE 3: FETCH_RANDOMNESS
  if (job.stage === "FETCH_RANDOMNESS") {
    console.log(`[Keeper Solo Processor] Stage 3: Checking on-chain status before fetchRandomness for round #${roundId.toString()}`);
    const { fetchTxHash } = await fetchRandomnessOnChain(roundId);

    job = await prisma.keeperJob.update({
      where: { id: job.id },
      data: {
        stage: "SETTLE_ROUND",
        status: "PENDING",
        fetchTxHash: fetchTxHash || job.fetchTxHash,
        lockedAt: null,
        nextRetryAt: null,
      },
    });
  }

  // STAGE 4: SETTLE_ROUND & SYNC
  if (job.stage === "SETTLE_ROUND") {
    console.log(`[Keeper Solo Processor] Stage 4: Settling round #${roundId.toString()}`);
    const { settleTxHash, onChainRound } = await settleRoundOnChain(roundId);
    const finalTxHash = settleTxHash || job.settleTxHash || "0x0";

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
      where: { id: job.id },
      data: {
        stage: "COMPLETED",
        status: "COMPLETED",
        settleTxHash: finalTxHash,
        lockedAt: null,
        nextRetryAt: null,
      },
    });

    console.log(`[Keeper Solo Processor] Round #${roundId.toString()} successfully synchronized & finalized! Winner: ${onChainRound.winnerAddress}`);
    return { success: true, stage: "COMPLETED", status: "COMPLETED" };
  }

  return { success: true, stage: job.stage, status: job.status };
}

// ─────────────────────────────────────────────────────────────────────────────
// ARENA KEEPER PROCESSOR
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function processArenaJob(job: any) {
  const arenaId = job.arenaId ? BigInt(job.arenaId.toString()) : null;
  if (!arenaId) {
    throw new Error("Arena job missing arenaId");
  }

  // Helper to query on-chain arena state
  const getOnChainArena = async () => {
    if (!xolatAddress) return null;
    try {
      const rawData = (await publicClient.readContract({
        address: xolatAddress,
        abi: xolatAbi,
        functionName: "getArena",
        args: [arenaId],
      })) as unknown as OnChainArenaTuple;

      return {
        arenaId: rawData[0],
        betAmount: rawData[1],
        maxPlayers: rawData[2],
        playerCount: rawData[3],
        settled: rawData[4],
        winner: rawData[5],
        createdAt: rawData[6],
        players: rawData[7],
        statusIndex: rawData[8],
      };
    } catch (err) {
      console.warn(`[Keeper Arena Processor] Could not read on-chain arena #${arenaId.toString()}:`, err);
      return null;
    }
  };

  // STAGE 1: WAIT_FOR_FULL_ARENA
  if (job.stage === "WAIT_FOR_FULL_ARENA") {
    console.log(`[Keeper Arena Processor] Stage 1: Checking full arena status for arena #${arenaId.toString()}`);
    const onChainArena = await getOnChainArena();
    const dbArena = await prisma.arena.findUnique({ where: { arenaId } });

    const currentPlayers = onChainArena ? onChainArena.playerCount : (dbArena?.currentPlayers || 1);
    const maxPlayers = onChainArena ? onChainArena.maxPlayers : (dbArena?.maxPlayers || 2);

    if (currentPlayers < maxPlayers) {
      console.log(`[Keeper Arena Processor] Arena #${arenaId.toString()} not full yet (${currentPlayers}/${maxPlayers}). Releasing worker lock.`);
      await prisma.keeperJob.update({
        where: { id: job.id },
        data: { status: "PENDING", lockedAt: null, nextRetryAt: null },
      });
      return { success: true, stage: "WAIT_FOR_FULL_ARENA", status: "PENDING", reason: "Waiting for full arena" };
    }

    job = await prisma.keeperJob.update({
      where: { id: job.id },
      data: {
        stage: "WAIT_FOR_ALL_CARD_PICKS",
        status: "PENDING",
        lockedAt: null,
        nextRetryAt: null,
      },
    });
  }

  // STAGE 2: WAIT_FOR_ALL_CARD_PICKS
  if (job.stage === "WAIT_FOR_ALL_CARD_PICKS") {
    console.log(`[Keeper Arena Processor] Stage 2: Checking card picks for arena #${arenaId.toString()}`);

    let onChainRoundId: bigint | null = job.roundId ? BigInt(job.roundId.toString()) : null;

    if (!onChainRoundId && xolatAddress) {
      try {
        const rawData = (await publicClient.readContract({
          address: xolatAddress,
          abi: xolatAbi,
          functionName: "getArena",
          args: [arenaId],
        })) as unknown as readonly [
          bigint, bigint, number, number, boolean, `0x${string}`, bigint, readonly `0x${string}`[], number, bigint, number
        ];
        // If there's an active round linked in the contract
        const roundIdFromContract = rawData[9] as bigint | undefined;
        if (roundIdFromContract && roundIdFromContract > 0n) {
          onChainRoundId = roundIdFromContract;
        }
      } catch {
        // Fallback: search on-chain RoundCreated event or check database round
      }
    }

    if (!onChainRoundId) {
      const dbRound = await prisma.round.findFirst({
        where: { type: "arena", potUsdm: { gt: 0 } },
        orderBy: { createdAt: "desc" },
      });
      if (dbRound) {
        onChainRoundId = dbRound.roundId;
      }
    }

    if (!onChainRoundId) {
      // Release lock to wait for players to pick cards
      console.log(`[Keeper Arena Processor] Arena #${arenaId.toString()} waiting for all card picks. Releasing lock.`);
      await prisma.keeperJob.update({
        where: { id: job.id },
        data: { status: "PENDING", lockedAt: null, nextRetryAt: null },
      });
      return { success: true, stage: "WAIT_FOR_ALL_CARD_PICKS", status: "PENDING", reason: "Waiting for all card picks" };
    }

    job = await prisma.keeperJob.update({
      where: { id: job.id },
      data: {
        roundId: onChainRoundId,
        stage: "REQUEST_RANDOMNESS",
        status: "PENDING",
        lockedAt: null,
        nextRetryAt: null,
      },
    });
  }

  const activeRoundId = job.roundId ? BigInt(job.roundId.toString()) : arenaId;

  // STAGE 3: REQUEST_RANDOMNESS
  if (job.stage === "REQUEST_RANDOMNESS") {
    console.log(`[Keeper Arena Processor] Stage 3: Requesting randomness for arena #${arenaId.toString()} (round #${activeRoundId.toString()})`);
    const { requestTxHash, requestBlock, celoPaid } = await requestRandomnessOnChain(activeRoundId);

    // Update Arena DB status
    await prisma.arena.update({
      where: { arenaId },
      data: { status: "RANDOMNESS_REQUESTED" },
    });

    job = await prisma.keeperJob.update({
      where: { id: job.id },
      data: {
        stage: "AWAIT_WITNET",
        status: "PENDING",
        requestTxHash,
        requestBlock,
        celoPaid: celoPaid.toString(),
        lockedAt: null,
        nextRetryAt: null,
      },
    });
  }

  // STAGE 4: AWAIT_WITNET
  if (job.stage === "AWAIT_WITNET") {
    console.log(`[Keeper Arena Processor] Stage 4: Checking Witnet oracle status for arena #${arenaId.toString()}`);
    const reqBlock = job.requestBlock ?? 0n;
    const { isRandomized, isTimeout } = await checkWitnetStatus(reqBlock, new Date(job.createdAt), activeRoundId);

    if (isTimeout) {
      await prisma.arena.update({
        where: { arenaId },
        data: { status: "REFUNDED" },
      });

      job = await prisma.keeperJob.update({
        where: { id: job.id },
        data: {
          stage: "REFUNDED",
          status: "COMPLETED",
          lockedAt: null,
          nextRetryAt: null,
        },
      });
      return { success: true, stage: "REFUNDED", status: "COMPLETED" };
    }

    if (isRandomized) {
      job = await prisma.keeperJob.update({
        where: { id: job.id },
        data: {
          stage: "FETCH_RANDOMNESS",
          status: "PENDING",
          lockedAt: null,
          nextRetryAt: null,
        },
      });
    } else {
      await prisma.keeperJob.update({
        where: { id: job.id },
        data: { status: "PENDING", lockedAt: null, nextRetryAt: null },
      });
      return { success: true, stage: "AWAIT_WITNET", status: "PENDING" };
    }
  }

  // STAGE 5: FETCH_RANDOMNESS
  if (job.stage === "FETCH_RANDOMNESS") {
    console.log(`[Keeper Arena Processor] Stage 5: Fetching randomness for arena #${arenaId.toString()}`);
    const { fetchTxHash } = await fetchRandomnessOnChain(activeRoundId);

    await prisma.arena.update({
      where: { arenaId },
      data: { status: "REVEALED" },
    });

    job = await prisma.keeperJob.update({
      where: { id: job.id },
      data: {
        stage: "SETTLE_ARENA",
        status: "PENDING",
        fetchTxHash: fetchTxHash || job.fetchTxHash,
        lockedAt: null,
        nextRetryAt: null,
      },
    });
  }

  // STAGE 6: SETTLE_ARENA / SETTLE_ROUND
  if (job.stage === "SETTLE_ARENA" || job.stage === "SETTLE_ROUND") {
    console.log(`[Keeper Arena Processor] Stage 6: Settling arena #${arenaId.toString()}`);
    const { settleTxHash } = await settleRoundOnChain(activeRoundId);

    job = await prisma.keeperJob.update({
      where: { id: job.id },
      data: {
        stage: "SYNC_DATABASE",
        status: "PENDING",
        settleTxHash: settleTxHash || job.settleTxHash || "0x0",
        lockedAt: null,
        nextRetryAt: null,
      },
    });

    // Directly continue to Stage 7
  }

  // STAGE 7: SYNC_DATABASE
  if (job.stage === "SYNC_DATABASE") {
    console.log(`[Keeper Arena Processor] Stage 7: Synchronizing database for arena #${arenaId.toString()}`);

    const finalTxHash = job.settleTxHash || "0x0";
    let winnerAddress = "";
    let potUsdmNumber = 0;
    let vrfRandomness = "";

    if (xolatAddress) {
      try {
        const onChainRoundRaw = (await publicClient.readContract({
          address: xolatAddress,
          abi: xolatAbi,
          functionName: "getRound",
          args: [activeRoundId],
        })) as unknown as OnChainRoundTuple;

        vrfRandomness = onChainRoundRaw[8];
        winnerAddress = onChainRoundRaw[10];
        potUsdmNumber = Number(onChainRoundRaw[11]) / 1e18;
      } catch (err) {
        console.warn(`[Keeper Arena Processor] Could not read final round on-chain for arena #${arenaId.toString()}:`, err);
      }
    }

    // 1. Synchronize Arena record
    const dbArena = await prisma.arena.findUnique({ where: { arenaId } });
    if (dbArena) {
      await prisma.arena.update({
        where: { arenaId },
        data: {
          status: "SETTLED",
          roundId: activeRoundId,
        },
      });
    }

    // 2. Synchronize Round record
    await prisma.round.upsert({
      where: { roundId: activeRoundId },
      update: {
        status: "completed",
        winnerAddress: winnerAddress || undefined,
        vrfRandom: vrfRandomness || undefined,
        txHash: finalTxHash,
      },
      create: {
        roundId: activeRoundId,
        type: "arena",
        commitHash: vrfRandomness || "0x0",
        winnerAddress: winnerAddress || "",
        vrfRandom: vrfRandomness || "0x0",
        status: "completed",
        potUsdm: potUsdmNumber.toString(),
        txHash: finalTxHash,
      },
    });

    // 3. Idempotently update winning Player totalWonUsdm stats (95% payout)
    if (winnerAddress && winnerAddress.startsWith("0x")) {
      const winnerLower = winnerAddress.toLowerCase();
      const winningPlayer = await prisma.player.findFirst({
        where: { address: { equals: winnerLower, mode: "insensitive" } },
      });
      if (winningPlayer) {
        const payoutAmount = potUsdmNumber * 0.95;
        await prisma.player.update({
          where: { id: winningPlayer.id },
          data: {
            totalWonUsdm: { increment: payoutAmount },
          },
        });
      }
    }

    // 4. Mark KeeperJob COMPLETED
    job = await prisma.keeperJob.update({
      where: { id: job.id },
      data: {
        stage: "COMPLETED",
        status: "COMPLETED",
        settleTxHash: finalTxHash,
        lockedAt: null,
        nextRetryAt: null,
      },
    });

    console.log(`[Keeper Arena Processor] Arena #${arenaId.toString()} successfully finalized & synchronized! Winner: ${winnerAddress}`);
    return { success: true, stage: "COMPLETED", status: "COMPLETED" };
  }

  return { success: true, stage: job.stage, status: job.status };
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPATCHER & MAIN PUBLIC ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

export async function processKeeperJob(identifierInput: bigint | string) {
  const identifierStr = identifierInput.toString();
  const identifierBig = !isNaN(Number(identifierStr)) ? BigInt(identifierStr) : null;
  const walletClient = getRelayerWalletClient();
  const account = getRelayerAccount();

  if (!xolatAddress || !walletClient || !account) {
    console.warn(`[Keeper Processor] Skipping job ${identifierStr} - relayer wallet or contract address not configured.`);
    return { success: false, reason: "Relayer environment not configured" };
  }

  // Periodic relayer wallet CELO balance check
  void checkRelayerBalance().catch(() => {});

  // Find job by roundId or arenaId or UUID id
  let job = await prisma.keeperJob.findFirst({
    where: {
      OR: [
        ...(identifierBig ? [{ roundId: identifierBig }, { arenaId: identifierBig }] : []),
        { id: identifierStr },
      ],
    },
  });

  if (!job) {
    console.warn(`[Keeper Processor] No keeper job found for identifier ${identifierStr}`);
    return { success: false, reason: "Job not found" };
  }

  if (job.status === "COMPLETED" || job.stage === "COMPLETED" || job.stage === "REFUNDED") {
    return { success: true, stage: job.stage, status: job.status };
  }

  const now = new Date();

  // Exponential Retry Backoff Check
  if (job.nextRetryAt && now < new Date(job.nextRetryAt)) {
    const remainingMs = new Date(job.nextRetryAt).getTime() - now.getTime();
    console.log(`[Keeper Processor] Job ${job.id} in backoff. Waiting ${(remainingMs / 1000).toFixed(1)}s before retry #${job.retryCount + 1}`);
    return { success: false, reason: "Waiting for exponential retry backoff" };
  }

  // Atomic Concurrency Locking
  const staleLockTime = new Date(now.getTime() - LOCK_TIMEOUT_MS);
  const lockClaimResult = await prisma.keeperJob.updateMany({
    where: {
      id: job.id,
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
  job = (await prisma.keeperJob.findUnique({ where: { id: job.id } })) || job;

  try {
    // DISPATCHER: SWITCH (job.type)
    switch (job.type ? job.type.toUpperCase() : "SOLO") {
      case "ARENA":
        return await processArenaJob(job);
      case "SOLO":
      default:
        return await processSoloJob(job);
    }
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Keeper Processor] Error processing job ${job.id} at stage ${job.stage}:`, errMessage);

    const nextRetryCount = job.retryCount + 1;
    const isFailed = nextRetryCount >= MAX_RETRIES;
    const delayMs = BACKOFF_SCHEDULE_MS[Math.min(nextRetryCount - 1, BACKOFF_SCHEDULE_MS.length - 1)];
    const nextRetryAt = isFailed ? null : new Date(Date.now() + delayMs);

    await prisma.keeperJob.update({
      where: { id: job.id },
      data: {
        status: isFailed ? "FAILED" : "PENDING",
        stage: isFailed ? "FAILED" : job.stage,
        retryCount: nextRetryCount,
        lastError: errMessage,
        nextRetryAt,
        lockedAt: null,
      },
    });

    console.log(`[Keeper Processor] Scheduled retry #${nextRetryCount} for job ${job.id} in ${(delayMs / 1000).toFixed(0)}s`);

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
      await processKeeperJob(job.id);
    }
  } catch (error) {
    console.error("[Keeper Processor Worker] Error polling pending jobs:", error);
  }
}

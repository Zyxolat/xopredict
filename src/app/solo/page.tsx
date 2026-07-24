"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { parseEventLogs, parseUnits } from "viem";
import { useSession } from "next-auth/react";
import { AppShell } from "@/components/app-shell";
import { BetInput } from "@/components/bet-input";
import { Card3D } from "@/components/card-3d";
import { Confetti } from "@/components/confetti";
import { EmptyState } from "@/components/state-displays";
import { NetworkGuard } from "@/components/network-guard";
import { UsdmApprovalGate } from "@/components/usdm-approval-gate";
import { xolatAbi } from "@/lib/contracts";
import { useUsdmBalance } from "@/lib/hooks/useUsdmBalance";
import { useStartSoloGame } from "@/lib/hooks/useStartSoloGame";
import { usePickSoloCard } from "@/lib/hooks/usePickSoloCard";

export default function SoloPage() {
  const { data: session } = useSession();
  const [bet, setBet] = useState("");
  const [pickedCard, setPickedCard] = useState<number | null>(null);
  const [activeGameId, setActiveGameId] = useState<bigint | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [gameStep, setGameStep] = useState<
    "enter_bet" | "game_created" | "waiting_randomness"
  >("enter_bet");

  // Keeper Status Polling State
  const [keeperStage, setKeeperStage] = useState<string | null>(null);
  const [keeperStatus, setKeeperStatus] = useState<string | null>(null);
  const [keeperMessage, setKeeperMessage] = useState<string | null>(null);
  const [keeperTxHashes, setKeeperTxHashes] = useState<{
    requestTxHash?: string | null;
    fetchTxHash?: string | null;
    settleTxHash?: string | null;
  }>({});

  const { balance, isLoading, isConnected, refetch: refetchBalance } = useUsdmBalance();

  // Start game on-chain hook
  const {
    startSoloGame,
    status: startStatus,
    txHash: startTxHash,
    receipt: startReceipt,
    errorMessage: startErrorMessage,
    reset: resetStartTx,
  } = useStartSoloGame();

  // Pick card on-chain hook
  const {
    pickSoloCard,
    status: pickStatus,
    txHash: pickTxHash,
    errorMessage: pickErrorMessage,
    reset: resetPickTx,
  } = usePickSoloCard();

  // Safely parse the bet string to wei — 0n while the input is empty or invalid
  const betAmountWei = useMemo(() => {
    try {
      return bet ? parseUnits(bet, 18) : 0n;
    } catch {
      return 0n;
    }
  }, [bet]);

  // Extract gameId from startSoloGame receipt logs
  useEffect(() => {
    if (startStatus === "success" && startReceipt && !activeGameId) {
      try {
        const logs = parseEventLogs({
          abi: xolatAbi,
          eventName: "RoundCreated",
          logs: startReceipt.logs,
        });
        if (logs && logs.length > 0) {
          const logArgs = (logs[0] as unknown as { args?: { roundId?: bigint } })?.args;
          if (logArgs?.roundId) {
            const gameId = logArgs.roundId;
            setActiveGameId(gameId);
            setGameStep("game_created");
            void refetchBalance();
          } else {
            const fallbackId = BigInt(Date.now());
            setActiveGameId(fallbackId);
            setGameStep("game_created");
            void refetchBalance();
          }
        } else {
          const fallbackId = BigInt(Date.now());
          setActiveGameId(fallbackId);
          setGameStep("game_created");
          void refetchBalance();
        }
      } catch (err) {
        console.error("Error parsing RoundCreated logs:", err);
        const fallbackId = BigInt(Date.now());
        setActiveGameId(fallbackId);
        setGameStep("game_created");
        void refetchBalance();
      }
    }
  }, [startStatus, startReceipt, activeGameId, refetchBalance]);

  // Synchronize with backend API after pickSoloCard transaction completes
  const syncBackend = async (confirmedHash: string, cardIndex: number) => {
    if (!session?.user?.id || activeGameId === null) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch("/api/solo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: session.user.id,
          cardIndex,
          betAmount: bet || "1",
          roundId: activeGameId.toString(),
          transactionHash: confirmedHash,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to record solo game on server");
      }

      setGameStep("waiting_randomness");
      void refetchBalance();
    } catch (err: unknown) {
      console.error("Backend sync error:", err);
      const msg = err instanceof Error ? err.message : "Backend sync failed";
      setSyncError(msg);
    } finally {
      setIsSyncing(false);
    }
  };

  // Trigger backend sync once pickSoloCard transaction is confirmed
  useEffect(() => {
    if (
      pickStatus === "success" &&
      pickTxHash &&
      pickedCard !== null &&
      gameStep === "game_created" &&
      !isSyncing &&
      !syncError
    ) {
      void syncBackend(pickTxHash, pickedCard);
    }
  }, [pickStatus, pickTxHash, pickedCard, gameStep, isSyncing, syncError]);

  // Poll automated relayer/keeper status endpoint while waiting for randomness & settlement
  useEffect(() => {
    if (gameStep !== "waiting_randomness" || !activeGameId) return;

    let isMounted = true;
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/solo/status/${activeGameId.toString()}`);
        if (!res.ok) return;

        const data = await res.json();
        if (isMounted && data.ok) {
          setKeeperStage(data.stage);
          setKeeperStatus(data.status);
          setKeeperMessage(data.message);
          setKeeperTxHashes({
            requestTxHash: data.requestTxHash,
            fetchTxHash: data.fetchTxHash,
            settleTxHash: data.settleTxHash,
          });

          if (data.status === "COMPLETED" || data.stage === "COMPLETED") {
            void refetchBalance();
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 2000);
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.error("Keeper status polling error:", err);
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [gameStep, activeGameId, refetchBalance]);

  // Step 1: Start Solo Game on-chain
  const handleStartGame = () => {
    if (!bet || betAmountWei === 0n || !session?.user?.id) return;
    setSyncError(null);
    if (startStatus === "rejected" || startStatus === "error") {
      resetStartTx();
    }
    startSoloGame(betAmountWei);
  };

  // Step 2: Pick Solo Card on-chain
  const handleSelectCard = (index: number) => {
    if (gameStep !== "game_created") return;
    if (activeGameId === null) {
      setSyncError("Invalid gameId. Please start a solo game first.");
      return;
    }
    if (index < 0 || index > 1) {
      setSyncError("Invalid card index selected.");
      return;
    }

    setPickedCard(index);
    setSyncError(null);
    if (pickStatus === "rejected" || pickStatus === "error") {
      resetPickTx();
    }
    pickSoloCard(activeGameId, index);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  };

  if (!isConnected) {
    return (
      <AppShell title="Solo Prediction">
        <section className="mx-auto max-w-2xl px-5 pt-8">
          <EmptyState message="Connect your wallet to play!" />
        </section>
      </AppShell>
    );
  }

  if (isLoading) {
    return (
      <AppShell title="Solo Prediction">
        <section className="mx-auto max-w-2xl px-5 pt-8">
          <EmptyState message="Loading balance..." />
        </section>
      </AppShell>
    );
  }

  const isStartBusy =
    startStatus === "pending_wallet" || startStatus === "confirming";
  const isPickBusy =
    pickStatus === "pending_wallet" || pickStatus === "confirming" || isSyncing;
  const activeTxHash = pickTxHash || startTxHash;

  return (
    <AppShell title="Solo Prediction">
      <motion.section
        className="mx-auto max-w-2xl px-5 pt-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {showConfetti && <Confetti />}

        {/* Balance Display */}
        <motion.div
          className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/[.08] to-white/[.02] p-7"
          variants={itemVariants}
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="font-mono text-xs tracking-[.18em] text-[#bfb3c6]">
                CURRENT BALANCE
              </p>
              <p className="mt-3 text-3xl font-bold text-[#d5a7ff]">
                {balance.toFixed(2)} USDm
              </p>
            </div>
            {activeGameId !== null && (
              <div className="text-right">
                <p className="font-mono text-[10px] tracking-[.15em] text-[#4ce47d]">
                  GAME ID #{activeGameId.toString()}
                </p>
                <p className="mt-1 font-mono text-xs text-[#d8cadd]">
                  {gameStep === "game_created"
                    ? "CARD PICK PHASE"
                    : keeperStatus === "COMPLETED"
                    ? "GAME COMPLETED"
                    : "KEEPER PROCESSING"}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Bet Input Section */}
        <motion.div className="mt-9" variants={itemVariants}>
          <BetInput
            value={bet}
            onChange={(val) => {
              if (gameStep === "enter_bet") setBet(val);
            }}
          />
          <div className="mt-5 flex justify-between font-mono text-sm tracking-[.12em]">
            <span>MULTIPLIER</span>
            <span className="text-3xl font-black text-[#4ce47d]">1.95x</span>
          </div>
        </motion.div>

        {/* Card Selection Grid */}
        <motion.div
          className="mt-16 grid grid-cols-2 gap-4"
          variants={itemVariants}
        >
          {["LEFT PATH", "RIGHT PATH"].map((label, index) => {
            const isSelected = pickedCard === index;
            const canPick = gameStep === "game_created" && !isPickBusy;

            return (
              <div key={label} className="relative">
                <Card3D
                  label={label}
                  selected={isSelected}
                  revealed={keeperStatus === "COMPLETED"}
                  value={index === 1 ? 100 : 42}
                  onClick={() => canPick && handleSelectCard(index)}
                />
                {gameStep === "enter_bet" && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] rounded-2xl flex items-center justify-center p-4 text-center pointer-events-none">
                    <span className="font-mono text-xs tracking-wider text-[#d8cadd]">
                      START GAME FIRST
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </motion.div>

        {/* Action Controls & Feedback */}
        <motion.div className="mt-8 space-y-3" variants={itemVariants}>
          {/* Error & Rejection Banners */}
          {(startStatus === "rejected" ||
            startStatus === "error" ||
            pickStatus === "rejected" ||
            pickStatus === "error" ||
            syncError) && (
            <motion.div
              className="rounded-xl border border-red-400/30 bg-red-400/[.08] px-4 py-3"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="font-mono text-xs tracking-[.14em] text-red-400">
                {startStatus === "rejected" || pickStatus === "rejected"
                  ? "⊗ TRANSACTION REJECTED"
                  : syncError
                  ? "⊗ BACKEND SYNC FAILED"
                  : "⊗ TRANSACTION FAILED"}
              </p>
              <p className="mt-1 text-xs text-red-300/80">
                {syncError ||
                  pickErrorMessage ||
                  startErrorMessage ||
                  "An error occurred during solo game execution."}
              </p>
              {syncError && pickTxHash && pickedCard !== null && (
                <button
                  onClick={() => void syncBackend(pickTxHash, pickedCard)}
                  className="mt-2 text-xs font-mono underline text-[#4ce47d]"
                >
                  RETRY BACKEND SYNC
                </button>
              )}
            </motion.div>
          )}

          {/* On-Chain Confirmation Banner */}
          {(startStatus === "confirming" || pickStatus === "confirming") &&
            activeTxHash && (
              <motion.div
                className="rounded-xl border border-[#d5a7ff]/20 bg-[#d5a7ff]/[.05] px-4 py-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p className="font-mono text-[10px] tracking-[.12em] text-[#d5a7ff]/70">
                  TX ON-CHAIN:{" "}
                  <a
                    href={`https://celoscan.io/tx/${activeTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-[#d5a7ff]"
                  >
                    {activeTxHash.slice(0, 12)}…{activeTxHash.slice(-6)}
                  </a>
                </p>
              </motion.div>
            )}

          {/* Step 1 Button: Start Game */}
          {gameStep === "enter_bet" && (
            <NetworkGuard>
              <UsdmApprovalGate betAmountWei={betAmountWei}>
                <motion.button
                  onClick={handleStartGame}
                  disabled={!bet || betAmountWei === 0n || isStartBusy}
                  className="w-full rounded-2xl bg-[#4ce47d] py-4 text-xl font-black text-black disabled:cursor-not-allowed disabled:opacity-40 transition"
                  whileHover={!isStartBusy ? { scale: 1.02 } : undefined}
                  whileTap={!isStartBusy ? { scale: 0.95 } : undefined}
                >
                  {startStatus === "pending_wallet"
                    ? "WAITING FOR WALLET..."
                    : startStatus === "confirming"
                    ? "CONFIRMING GAME ON-CHAIN..."
                    : "START SOLO GAME"}
                </motion.button>
              </UsdmApprovalGate>
            </NetworkGuard>
          )}

          {/* Step 2 Prompt: Select Card */}
          {gameStep === "game_created" && (
            <div className="rounded-2xl border border-[#d5a7ff]/30 bg-[#d5a7ff]/[.08] p-4 text-center">
              <p className="font-mono text-sm tracking-[.15em] text-[#d5a7ff]">
                {pickStatus === "pending_wallet"
                  ? "WAITING FOR WALLET SIGNATURE..."
                  : pickStatus === "confirming"
                  ? "CONFIRMING CARD PICK ON-CHAIN..."
                  : isSyncing
                  ? "SAVING GAME BACKEND..."
                  : "SELECT YOUR PATH TO PICK A CARD"}
              </p>
              <p className="mt-1 text-xs text-[#d8cadd]">
                Click Left Path or Right Path to send on-chain pickSoloCard()
              </p>
            </div>
          )}

          {/* Step 3 Relayer / Keeper Progress Banner */}
          {gameStep === "waiting_randomness" && (
            <motion.div
              className={`rounded-2xl border p-5 text-center transition ${
                keeperStatus === "COMPLETED"
                  ? "border-[#4ce47d]/40 bg-[#4ce47d]/[.1]"
                  : keeperStatus === "FAILED"
                  ? "border-red-400/40 bg-red-400/[.1]"
                  : "border-[#d5a7ff]/30 bg-[#d5a7ff]/[.08]"
              }`}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <div className="flex items-center justify-center gap-2">
                {keeperStatus !== "COMPLETED" && keeperStatus !== "FAILED" && (
                  <motion.span
                    className="block h-4 w-4 rounded-full border-2 border-[#d5a7ff]/30 border-t-[#d5a7ff]"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                )}
                <p className="font-mono text-base font-bold tracking-[.18em] text-[#d5a7ff]">
                  {keeperStatus === "COMPLETED"
                    ? "ROUND COMPLETED & SETTLED!"
                    : keeperStage === "REQUEST_RANDOMNESS"
                    ? "REQUESTING RANDOMNESS..."
                    : keeperStage === "AWAIT_WITNET"
                    ? "WAITING FOR WITNET ORACLE..."
                    : keeperStage === "FETCH_RANDOMNESS"
                    ? "FETCHING RANDOMNESS..."
                    : keeperStage === "SETTLE_ROUND"
                    ? "SETTLING ROUND ON-CHAIN..."
                    : "PROCESSING ON-CHAIN"}
                </p>
              </div>

              <p className="mt-2 text-xs text-[#d8cadd]">
                {keeperMessage || `Game #${activeGameId?.toString()} is being automatically processed by the relayer keeper service.`}
              </p>

              {/* Display Relayer Tx Hashes */}
              {(keeperTxHashes.requestTxHash || keeperTxHashes.settleTxHash) && (
                <div className="mt-3 flex justify-center gap-4 text-[10px] font-mono text-[#d8cadd]/70">
                  {keeperTxHashes.requestTxHash && (
                    <a
                      href={`https://celoscan.io/tx/${keeperTxHashes.requestTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-[#d5a7ff]"
                    >
                      Req Tx ↗
                    </a>
                  )}
                  {keeperTxHashes.settleTxHash && (
                    <a
                      href={`https://celoscan.io/tx/${keeperTxHashes.settleTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-[#4ce47d]"
                    >
                      Settle Tx ↗
                    </a>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </motion.section>
    </AppShell>
  );
}

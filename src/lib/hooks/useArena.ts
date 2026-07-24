"use client";

import { useEffect, useState, useCallback } from "react";
import { useReadContract } from "wagmi";
import { xolatAbi, xolatAddress } from "@/lib/contracts";

export interface ArenaData {
  id?: string;
  arenaId: bigint;
  betAmount: string;
  maxPlayers: number;
  currentPlayers: number;
  settled: boolean;
  winner: string | null;
  createdAt: number;
  players: string[];
  status: string; // OPEN, FULL, PICKING, RANDOMNESS_REQUESTED, REVEALED, SETTLED, EXPIRED, REFUNDED
}

const STATUS_MAP: Record<number, string> = {
  0: "OPEN",
  1: "FULL",
  2: "PICKING",
  3: "RANDOMNESS_REQUESTED",
  4: "REVEALED",
  5: "SETTLED",
  6: "REFUNDED",
  7: "EXPIRED",
};

export function useArena(arenaIdInput: string | bigint | null | undefined) {
  const [arenaId, setArenaId] = useState<bigint | null>(() => {
    if (!arenaIdInput) return null;
    try {
      return typeof arenaIdInput === "bigint" ? arenaIdInput : BigInt(arenaIdInput);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!arenaIdInput) {
      setArenaId(null);
      return;
    }
    try {
      setArenaId(typeof arenaIdInput === "bigint" ? arenaIdInput : BigInt(arenaIdInput));
    } catch {
      setArenaId(null);
    }
  }, [arenaIdInput]);

  const [dbData, setDbData] = useState<ArenaData | null>(null);

  // Read on-chain contract getArena
  const {
    data: contractData,
    isLoading: isContractLoading,
    isError: isContractError,
    error: contractError,
    refetch: refetchContract,
  } = useReadContract({
    address: xolatAddress,
    abi: xolatAbi,
    functionName: "getArena",
    args: arenaId !== null ? [arenaId] : undefined,
    query: {
      enabled: arenaId !== null && !!xolatAddress,
    },
  });

  // Fetch DB state from backend REST API
  const fetchDbState = useCallback(async () => {
    if (!arenaIdInput) return;
    try {
      const res = await fetch(`/api/arenas/${arenaIdInput.toString()}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.data?.arena) {
        const raw = json.data.arena;
        setDbData({
          id: raw.id,
          arenaId: BigInt(raw.arenaId),
          betAmount: raw.betAmount,
          maxPlayers: raw.maxPlayers,
          currentPlayers: raw.currentPlayers,
          settled: raw.status === "SETTLED" || raw.status === "EXPIRED" || raw.status === "REFUNDED",
          winner: raw.winner || null,
          createdAt: new Date(raw.createdAt).getTime() / 1000,
          players: raw.players || [],
          status: raw.status,
        });
      }
    } catch (err) {
      console.warn("[useArena] DB fetch error:", err);
    }
  }, [arenaIdInput]);

  useEffect(() => {
    void fetchDbState();
  }, [fetchDbState]);

  let arena: ArenaData | null = null;

  if (contractData) {
    const [
      cId,
      cBet,
      cMax,
      cCurrent,
      cSettled,
      cWinner,
      cCreated,
      cPlayers,
      cStatusIdx,
    ] = contractData as unknown as readonly [
      bigint,
      bigint,
      number,
      number,
      boolean,
      string,
      bigint,
      readonly string[],
      number
    ];

    arena = {
      arenaId: cId,
      betAmount: (Number(cBet) / 1e18).toString(),
      maxPlayers: Number(cMax),
      currentPlayers: Number(cCurrent),
      settled: cSettled,
      winner: cWinner === "0x0000000000000000000000000000000000000000" ? null : cWinner,
      createdAt: Number(cCreated),
      players: cPlayers.map((p) => p.toLowerCase()),
      status: STATUS_MAP[Number(cStatusIdx)] || dbData?.status || "OPEN",
    };
  } else if (dbData) {
    arena = dbData;
  }

  const refetch = useCallback(async () => {
    await Promise.all([refetchContract(), fetchDbState()]);
  }, [refetchContract, fetchDbState]);

  return {
    arena,
    isLoading: isContractLoading && !dbData,
    isError: isContractError,
    error: contractError,
    refetch,
  };
}

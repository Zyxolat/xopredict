"use client";

import { useMemo } from "react";
import { ArenaData } from "@/lib/hooks/useArena";

export function useArenaStatus(arena: ArenaData | null | undefined) {
  return useMemo(() => {
    if (!arena) {
      return {
        status: "UNKNOWN",
        isOpen: false,
        isFull: false,
        isPickingPhase: false,
        isWaitingForKeeper: false,
        isSettled: false,
        isExpired: false,
        isRefunded: false,
        isJoinable: false,
      };
    }

    const status = arena.status?.toUpperCase() || "OPEN";

    const isOpen = status === "OPEN";
    const isFull = status === "FULL";
    const isPickingPhase = status === "PICKING";
    const isWaitingForKeeper =
      status === "RANDOMNESS_REQUESTED" || status === "REVEALED";
    const isSettled = status === "SETTLED" || arena.settled;
    const isExpired = status === "EXPIRED";
    const isRefunded = status === "REFUNDED";

    const isJoinable =
      isOpen && arena.currentPlayers < arena.maxPlayers && !isSettled;

    return {
      status,
      isOpen,
      isFull,
      isPickingPhase,
      isWaitingForKeeper,
      isSettled,
      isExpired,
      isRefunded,
      isJoinable,
    };
  }, [arena]);
}

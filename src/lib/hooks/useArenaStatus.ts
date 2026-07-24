"use client";

import { useMemo } from "react";
import { ArenaData } from "@/lib/hooks/useArena";

export function useArenaStatus(arena: ArenaData | null | undefined, statusOverride?: string | null) {
  return useMemo(() => {
    if (!arena && !statusOverride) {
      return {
        status: "UNKNOWN",
        displayLabel: "Loading...",
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

    const rawStatus = (statusOverride || arena?.status || "OPEN").toUpperCase();

    const isOpen = rawStatus === "OPEN" || rawStatus === "WAITING_FOR_PLAYERS";
    const isFull = rawStatus === "FULL";
    const isPickingPhase = rawStatus === "PICKING" || rawStatus === "WAITING_FOR_CARD_PICKS";
    const isWaitingForKeeper =
      rawStatus === "REQUESTING_RANDOMNESS" ||
      rawStatus === "WAITING_FOR_WITNET" ||
      rawStatus === "FETCHING_RANDOMNESS" ||
      rawStatus === "SETTLING" ||
      rawStatus === "RANDOMNESS_REQUESTED" ||
      rawStatus === "REVEALED";

    const isSettled = rawStatus === "SETTLED" || rawStatus === "COMPLETED" || Boolean(arena?.settled);
    const isExpired = rawStatus === "EXPIRED";
    const isRefunded = rawStatus === "REFUNDED";

    const isJoinable =
      isOpen && (arena ? arena.currentPlayers < arena.maxPlayers : true) && !isSettled;

    let displayLabel = "Processing...";
    switch (rawStatus) {
      case "OPEN":
      case "WAITING_FOR_PLAYERS":
        displayLabel = "Waiting for players...";
        break;
      case "FULL":
      case "PICKING":
      case "WAITING_FOR_CARD_PICKS":
        displayLabel = "Waiting for card picks...";
        break;
      case "REQUESTING_RANDOMNESS":
        displayLabel = "Requesting randomness...";
        break;
      case "WAITING_FOR_WITNET":
      case "RANDOMNESS_REQUESTED":
        displayLabel = "Waiting for Witnet...";
        break;
      case "FETCHING_RANDOMNESS":
      case "REVEALED":
        displayLabel = "Fetching randomness...";
        break;
      case "SETTLING":
        displayLabel = "Settling arena...";
        break;
      case "SETTLED":
      case "COMPLETED":
        displayLabel = "Winner paid!";
        break;
      case "REFUNDED":
        displayLabel = "Refunded";
        break;
      case "EXPIRED":
        displayLabel = "Expired";
        break;
    }

    return {
      status: rawStatus,
      displayLabel,
      isOpen,
      isFull,
      isPickingPhase,
      isWaitingForKeeper,
      isSettled,
      isExpired,
      isRefunded,
      isJoinable,
    };
  }, [arena, statusOverride]);
}

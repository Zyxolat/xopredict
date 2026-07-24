"use client";

import { useEffect, useState, useCallback, useRef } from "react";

export interface StatusResponseData {
  status: string;
  currentPlayers: number;
  maxPlayers: number;
  arena: {
    id: string;
    arenaId: string;
    status: string;
    currentPlayers: number;
    maxPlayers: number;
    players: string[];
    settled?: boolean;
    winner?: string | null;
  };
}

export function useArenaPolling(
  arenaIdInput: string | bigint | null | undefined,
  intervalMs = 3000
) {
  const [statusData, setStatusData] = useState<StatusResponseData | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const arenaIdStr = arenaIdInput ? arenaIdInput.toString() : null;
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!arenaIdStr) return;

    try {
      const res = await fetch(`/api/arenas/${arenaIdStr}/status`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Status HTTP ${res.status}`);
      }
      const json = await res.json();
      if (json.data && isMounted.current) {
        setStatusData(json.data);
        setLastUpdated(new Date());
        setError(null);
      }
    } catch (err: unknown) {
      if (isMounted.current) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      }
    }
  }, [arenaIdStr]);

  useEffect(() => {
    if (!arenaIdStr) {
      setIsPolling(false);
      return;
    }

    // Determine if polling should stop based on status
    const currentStatus = statusData?.status?.toUpperCase();
    const isTerminal =
      currentStatus === "SETTLED" ||
      currentStatus === "EXPIRED" ||
      currentStatus === "REFUNDED";

    if (isTerminal) {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);

    // Initial fetch
    void fetchStatus();

    const interval = setInterval(() => {
      void fetchStatus();
    }, intervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [arenaIdStr, fetchStatus, intervalMs, statusData?.status]);

  return {
    statusData,
    isPolling,
    lastUpdated,
    error,
    refetchNow: fetchStatus,
  };
}

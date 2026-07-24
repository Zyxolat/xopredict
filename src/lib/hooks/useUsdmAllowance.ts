"use client";

import { useAccount, useReadContract } from "wagmi";
import { usdmAbi, usdmAddress, xolatAddress } from "@/lib/contracts";

/**
 * Reads the USDm allowance that the connected wallet has granted to the
 * Xolat contract.  Auto-refreshes every 6 s (≈ Celo block time).
 */
export function useUsdmAllowance() {
  const { address } = useAccount();

  const { data, isLoading, error, refetch } = useReadContract({
    address: usdmAddress,
    abi: usdmAbi,
    functionName: "allowance",
    args: address && xolatAddress ? [address, xolatAddress] : undefined,
    query: {
      enabled: !!address && !!usdmAddress && !!xolatAddress,
      // Poll roughly once per Celo block so the gate transitions promptly
      // after a successful approval without waiting for a page interaction.
      refetchInterval: 6_000,
    },
  });

  return {
    /** Raw allowance in wei (18 decimals).  0n when not connected or errored. */
    allowance: (data as bigint | undefined) ?? 0n,
    isLoading,
    error,
    /** Call after approval confirmation for an immediate re-read. */
    refetch,
  };
}

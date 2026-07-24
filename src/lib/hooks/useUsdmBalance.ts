"use client";

import { useAccount, useReadContract } from "wagmi";
import { usdmAbi, usdmAddress } from "@/lib/contracts";
import { formatUnits } from "viem";

export function useUsdmBalance() {
  const { address } = useAccount();

  const { data, isLoading, error, refetch } = useReadContract({
    address: usdmAddress,
    abi: usdmAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!usdmAddress,
    },
  });

  // Convert from contract units (18 decimals) to readable decimal
  const balanceInUsdm = data ? parseFloat(formatUnits(data as bigint, 18)) : 0;

  return {
    balance: balanceInUsdm,
    balanceBigInt: data as bigint | undefined,
    isLoading,
    error,
    refetch,
    isConnected: !!address,
  };
}

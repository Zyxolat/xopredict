"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState, useEffect } from "react";
import { wagmiConfig } from "@/lib/wagmi";

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Restore wallet from localStorage on mount
    const savedWallet = localStorage.getItem("walletAddress");
    if (savedWallet) {
      // This will trigger auto-reconnect through wagmi
    }
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <SessionProvider>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </SessionProvider>
  );
}

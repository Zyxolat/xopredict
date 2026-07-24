"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";
import { wagmiConfig } from "@/lib/wagmi";
import { useWalletPersistence } from "@/lib/hooks/useWalletPersistence";

function WalletSessionRestorer() {
  useWalletPersistence();
  return null;
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider>
      <WagmiProvider config={wagmiConfig} reconnectOnMount>
        <QueryClientProvider client={queryClient}>
          <WalletSessionRestorer />
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </SessionProvider>
  );
}

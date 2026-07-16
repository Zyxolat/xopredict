"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export function useWalletPersistence() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastSavedAddress, setLastSavedAddress] = useState<string | null>(null);

  // Save wallet to localStorage when connected
  useEffect(() => {
    if (isConnected && address) {
      localStorage.setItem("walletAddress", address);
      localStorage.setItem("walletConnectedTime", Date.now().toString());
      setLastSavedAddress(address);
    }
  }, [isConnected, address]);

  // Load wallet from localStorage on app start
  useEffect(() => {
    const savedWallet = localStorage.getItem("walletAddress");
    if (savedWallet && !isConnected && connectors.length > 0) {
      // Auto-reconnect attempt
      const connector = connectors[0];
      try {
        connect({ connector });
        setLastSavedAddress(savedWallet);
      } catch (error) {
        console.error("Reconnect attempt failed:", error);
      }
    }
    setIsLoaded(true);
  }, [isConnected, connectors, connect]);

  // Handle disconnect
  const handleDisconnect = () => {
    disconnect();
    localStorage.removeItem("walletAddress");
    localStorage.removeItem("walletConnectedTime");
    setLastSavedAddress(null);
  };

  return {
    address,
    isConnected,
    isLoaded,
    lastSavedAddress,
    handleDisconnect,
  };
}

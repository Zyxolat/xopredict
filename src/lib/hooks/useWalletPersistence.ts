"use client";

import { useEffect, useRef } from "react";
import { useAccount, useDisconnect } from "wagmi";

export function useWalletPersistence() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const lastSavedAddress = useRef<string | null>(null);

  // Save wallet to localStorage when connected
  useEffect(() => {
    if (isConnected && address) {
      localStorage.setItem("walletAddress", address);
      localStorage.setItem("walletConnectedTime", Date.now().toString());
      lastSavedAddress.current = address;
    }
  }, [isConnected, address]);

  // Handle disconnect
  const handleDisconnect = () => {
    disconnect();
    localStorage.removeItem("walletAddress");
    localStorage.removeItem("walletConnectedTime");
    lastSavedAddress.current = null;
  };

  return {
    address,
    isConnected,
    isLoaded: true,
    lastSavedAddress: lastSavedAddress.current,
    handleDisconnect,
  };
}

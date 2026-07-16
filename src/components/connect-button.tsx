"use client";

import { Wallet } from "lucide-react";
import { useAccount, useConnect } from "wagmi";
import { useWalletPersistence } from "@/lib/hooks/useWalletPersistence";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { handleDisconnect } = useWalletPersistence();

  if (isConnected) {
    return (
      <button
        onClick={handleDisconnect}
        className="flex items-center gap-2 rounded-full border border-[#4ce47d]/60 bg-[#4ce47d]/10 px-4 py-2 font-mono text-xs tracking-[.14em] text-[#baf8cb] hover:bg-[#4ce47d]/20 transition"
        title="Disconnect wallet"
      >
        <Wallet size={14} />
        {address?.slice(0, 6)}…{address?.slice(-4)}
      </button>
    );
  }

  const connector = connectors[0];
  return (
    <button
      disabled={!connector || isPending}
      onClick={() => connector && connect({ connector })}
      className="flex items-center gap-2 rounded-full border border-[#8d739c] bg-[#211a27] px-4 py-2 font-mono text-xs tracking-[.14em] text-[#e1c3ff] disabled:opacity-50 hover:border-[#d5a7ff] transition"
    >
      <Wallet size={14} />
      {isPending ? "CONNECTING" : "CONNECT"}
    </button>
  );
}

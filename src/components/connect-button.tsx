"use client";

import { Wallet } from "lucide-react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) return <button onClick={() => disconnect()} className="flex items-center gap-2 rounded-full border border-[#4ce47d]/60 bg-[#4ce47d]/10 px-4 py-2 font-mono text-xs tracking-[.14em] text-[#baf8cb]" title="Disconnect wallet"><Wallet size={14} />{address?.slice(0, 6)}…{address?.slice(-4)}</button>;
  const connector = connectors[0];
  return <button disabled={!connector || isPending} onClick={() => connector && connect({ connector })} className="flex items-center gap-2 rounded-full border border-[#8d739c] bg-[#211a27] px-4 py-2 font-mono text-xs tracking-[.14em] text-[#e1c3ff] disabled:opacity-50"><Wallet size={14} />{isPending ? "CONNECTING" : "CONNECT"}</button>;
}

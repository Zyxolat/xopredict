"use client";

import { Wallet, PlusCircle } from "lucide-react";
import { useAppKit } from "@reown/appkit/react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const { status } = useSession();

  const [isLinking, setIsLinking] = useState(false);
  const [isLinked, setIsLinked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if current connected wallet is already linked to authenticated user
  useEffect(() => {
    if (!isConnected || !address || status !== "authenticated") {
      setIsLinked(false);
      return;
    }

    const checkLinked = async () => {
      try {
        const res = await fetch("/api/auth/wallets");
        if (res.ok) {
          const json = await res.json();
          const wallets: Array<{ address: string }> = json.data || [];
          const linked = wallets.some(
            (w) => w.address.toLowerCase() === address.toLowerCase()
          );
          setIsLinked(linked);
        }
      } catch (err) {
        console.error("Error checking linked wallets:", err);
      }
    };

    void checkLinked();
  }, [address, isConnected, status]);

  const handleLinkWallet = async () => {
    if (!address || status !== "authenticated") return;
    setIsLinking(true);
    setError(null);

    try {
      // 1. Fetch signing nonce
      const nonceRes = await fetch("/api/auth/wallet");
      if (!nonceRes.ok) {
        throw new Error("Failed to get signing nonce. Please make sure you are logged in.");
      }
      const { nonce, message } = await nonceRes.json();

      // 2. Sign message with wallet (NOT a transaction)
      const signature = await signMessageAsync({ message });

      // 3. Link wallet on backend
      const linkRes = await fetch("/api/auth/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature, nonce }),
      });

      const json = await linkRes.json();
      if (!linkRes.ok) {
        throw new Error(json.error || "Failed to link wallet");
      }

      setIsLinked(true);
    } catch (err: unknown) {
      console.error("Wallet linking error:", err);
      const msg = err instanceof Error ? err.message : "Failed to link wallet";
      setError(msg);
    } finally {
      setIsLinking(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setIsLinked(false);
    setError(null);
  };

  if (isConnected && address) {
    const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;

    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          {status === "authenticated" && !isLinked && (
            <button
              onClick={handleLinkWallet}
              disabled={isLinking}
              className="flex items-center gap-1.5 rounded-full bg-[#4ce47d] px-3 py-1.5 font-mono text-xs font-bold text-black hover:bg-[#3ecb6c] transition disabled:opacity-50"
            >
              <PlusCircle size={14} />
              {isLinking ? "LINKING..." : "LINK WALLET"}
            </button>
          )}

          <button
            onClick={handleDisconnect}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-xs tracking-[.14em] transition ${
              isLinked
                ? "border-[#4ce47d]/60 bg-[#4ce47d]/10 text-[#baf8cb] hover:bg-[#4ce47d]/20"
                : "border-yellow-400/50 bg-yellow-400/10 text-yellow-300 hover:bg-yellow-400/20"
            }`}
            title="Click to disconnect wallet"
          >
            <Wallet size={14} />
            {shortAddr} {isLinked ? "✓" : "(UNLINKED)"}
          </button>
        </div>
        {error && <p className="text-[10px] text-red-300 max-w-[200px] text-right">{error}</p>}
      </div>
    );
  }

  return (
    <button
      onClick={() => void open()}
      className="flex items-center gap-2 rounded-full border border-[#8d739c] bg-[#211a27] px-4 py-2 font-mono text-xs tracking-[.14em] text-[#e1c3ff] hover:border-[#d5a7ff] transition"
    >
      <Wallet size={14} />
      CONNECT WALLET
    </button>
  );
}

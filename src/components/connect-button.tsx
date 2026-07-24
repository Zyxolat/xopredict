"use client";

import { Wallet } from "lucide-react";
import { useAppKit } from "@reown/appkit/react";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const { status } = useSession();
  const authenticatedAddress = useRef<string>();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string>();

  const handleDisconnect = () => {
    disconnect();
    localStorage.removeItem("walletAddress");
    localStorage.removeItem("walletConnectedTime");
    authenticatedAddress.current = undefined;
  };

  useEffect(() => {
    if (!isConnected || !address || authenticatedAddress.current === address) return;

    const authenticate = async () => {
      setIsAuthenticating(true);
      setError(undefined);

      try {
        const nonce = crypto.randomUUID();
        const message = `Sign in to XOLAT\nWallet: ${address}\nTimestamp: ${Date.now()}\nNonce: ${nonce}`;
        const signature = await signMessageAsync({ message });
        if (status === "authenticated") {
          const response = await fetch("/api/auth/wallet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address, message, signature }),
          });
          if (!response.ok) {
            const body = await response.json().catch(() => null);
            throw new Error(body?.error ?? "Wallet authentication failed");
          }
        } else {
          const result = await signIn("credentials", {
            address,
            message,
            signature,
            redirect: false,
          });
          if (result?.error) throw new Error(result.error);
        }
        authenticatedAddress.current = address;
      } catch (authenticationError) {
        setError(
          authenticationError instanceof Error
            ? authenticationError.message
            : "Wallet authentication failed"
        );
      } finally {
        setIsAuthenticating(false);
      }
    };

    void authenticate();
  }, [address, isConnected, signMessageAsync, status]);

  if (isConnected) {
    return (
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={handleDisconnect}
          className="flex items-center gap-2 rounded-full border border-[#4ce47d]/60 bg-[#4ce47d]/10 px-4 py-2 font-mono text-xs tracking-[.14em] text-[#baf8cb] hover:bg-[#4ce47d]/20 transition"
          title="Disconnect wallet"
        >
          <Wallet size={14} />
          {isAuthenticating ? "AUTHENTICATING" : `${address?.slice(0, 6)}...${address?.slice(-4)}`}
        </button>
        {error && <p className="text-xs text-red-300">{error}</p>}
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

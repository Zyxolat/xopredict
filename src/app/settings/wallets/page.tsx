"use client";

import { useEffect, useState } from "react";
import { Wallet as WalletIcon, Trash2 } from "lucide-react";
import { ConnectButton } from "@/components/connect-button";

interface WalletItem {
  id: string;
  address: string;
  walletType: string;
  network: string;
  isPrimary: boolean;
  verifiedAt: string;
}

export default function WalletsSettingsPage() {
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWallets = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/wallets");
      if (res.ok) {
        const json = await res.json();
        setWallets(json.data || []);
      }
    } catch {
      setError("Failed to load linked wallets");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchWallets();
  }, []);

  const handleSetPrimary = async (address: string) => {
    try {
      const res = await fetch("/api/auth/wallets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (res.ok) {
        void fetchWallets();
      }
    } catch (err) {
      console.error("Error setting primary wallet:", err);
    }
  };

  const handleRemove = async (address: string) => {
    if (!confirm(`Are you sure you want to unlink wallet ${address}?`)) return;
    try {
      const res = await fetch("/api/auth/wallets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (res.ok) {
        void fetchWallets();
      } else {
        const json = await res.json();
        alert(json.error || "Failed to remove wallet");
      }
    } catch (err) {
      console.error("Error removing wallet:", err);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <WalletIcon size={20} className="text-[#d5a7ff]" /> Linked Blockchain Identity
            </h2>
            <p className="mt-1 text-xs text-[#a79cae]">
              Connect & link EVM wallets to play prediction matches.
            </p>
          </div>
          <ConnectButton />
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 font-mono text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Linked Wallets List */}
        <div className="mt-6 space-y-3">
          <h3 className="font-mono text-xs text-[#d8cadd]">
            YOUR LINKED WALLETS ({wallets.length})
          </h3>

          {isLoading ? (
            <div className="p-4 text-center font-mono text-xs text-[#8e8892]">
              Loading wallets...
            </div>
          ) : wallets.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-center text-xs text-[#a79cae]">
              No wallets linked yet. Use the Connect Button above to link your EVM wallet.
            </div>
          ) : (
            wallets.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-white/15 bg-white/5 p-2 text-[#d5a7ff]">
                    <WalletIcon size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white tracking-wider">
                        {w.address.slice(0, 8)}...{w.address.slice(-6)}
                      </span>
                      {w.isPrimary ? (
                        <span className="rounded-full bg-[#4ce47d]/10 border border-[#4ce47d]/40 px-2.5 py-0.5 text-[10px] font-bold text-[#4ce47d]">
                          PRIMARY
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[10px] text-[#8e8892]">
                      {w.network.toUpperCase()} • Linked{" "}
                      {new Date(w.verifiedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!w.isPrimary && (
                    <button
                      onClick={() => handleSetPrimary(w.address)}
                      className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] text-[#d5a7ff] hover:bg-white/10 transition"
                      title="Set as primary wallet"
                    >
                      Make Primary
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(w.address)}
                    className="rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20 transition"
                    title="Unlink wallet"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

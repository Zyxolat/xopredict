"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface VIPPassInfo {
  active: boolean;
  expiresAt: string | null;
  price: number;
  duration: number;
  benefits: string[];
}

export function VIPPass() {
  const { data: session } = useSession();
  const [vipInfo, setVipInfo] = useState<VIPPassInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (!session?.user?.playerId) return;

    const fetchVIP = async () => {
      try {
        const res = await fetch(`/api/vip?playerId=${session.user!.playerId}`);
        const data = await res.json();
        setVipInfo(data.data);
      } catch (error) {
        console.error("Failed to fetch VIP info:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVIP();
  }, [session?.user]);

  const handlePurchase = async () => {
    if (!session?.user?.playerId) return;

    setPurchasing(true);
    try {
      const res = await fetch("/api/vip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: session.user!.playerId }),
      });

      if (res.ok) {
        alert("VIP pass purchased! Enjoy premium benefits.");
        // Refresh VIP info
        const res2 = await fetch(`/api/vip?playerId=${session.user!.playerId}`);
        const data = await res2.json();
        setVipInfo(data.data);
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to purchase VIP:", error);
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return <div className="text-slate-400 text-sm">Loading...</div>;
  }

  if (!vipInfo) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-amber-900/30 to-yellow-900/30 border border-amber-500/30 rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-amber-300">👑 VIP Pass</h3>
        {vipInfo.active && (
          <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">
            Active
          </span>
        )}
      </div>

      <div className="mb-4 space-y-2">
        {vipInfo.benefits.map((benefit, idx) => (
          <div key={idx} className="flex items-start text-sm">
            <span className="text-yellow-400 mr-2">✓</span>
            <span className="text-slate-300">{benefit}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <span className="text-lg font-bold text-yellow-400">
          {vipInfo.price} USDm
        </span>
        <button
          onClick={handlePurchase}
          disabled={vipInfo.active || purchasing}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            vipInfo.active
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : "bg-gradient-to-r from-amber-600 to-yellow-600 hover:opacity-90 text-white"
          }`}
        >
          {purchasing
            ? "Purchasing..."
            : vipInfo.active
              ? "Already VIP"
              : `Get VIP for ${vipInfo.duration} days`}
        </button>
      </div>
    </div>
  );
}

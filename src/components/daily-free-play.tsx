"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface DailyFreePlayStatus {
  eligible: boolean;
  nextAvailable: string | null;
  streakDays: number;
  multiplier: number;
  freePlayAmount: number;
}

export function DailyFreePlay() {
  const { data: session } = useSession();
  const [status, setStatus] = useState<DailyFreePlayStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!session?.user?.playerId) return;

    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/daily-free-play", {
          method: "GET",
        });
        const data = await res.json();
        setStatus(data.data);
      } catch (error) {
        console.error("Failed to fetch daily free play:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [session?.user?.playerId]);

  const handleClaim = async () => {
    if (!session?.user?.playerId || !status?.eligible) return;

    setClaiming(true);
    try {
      const res = await fetch("/api/daily-free-play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: session.user!.playerId }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({
          ...status,
          eligible: false,
          streakDays: data.data.streakDays,
          nextAvailable: new Date(
            Date.now() + 24 * 60 * 60 * 1000
          ).toISOString(),
        });
        alert(
          `Claimed ${data.data.freePlayAmount} USDm with ${data.data.multiplier}x streak multiplier!`
        );
      }
    } catch (error) {
      console.error("Failed to claim:", error);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return <div className="text-slate-400 text-sm">Loading...</div>;
  }

  if (!status) {
    return <div className="text-slate-400 text-sm">Unavailable</div>;
  }

  return (
    <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-purple-300">🎁 Daily Free Play</h3>
        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
          {status.streakDays} day streak
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-slate-400 mb-1">Free Amount</p>
          <p className="text-lg font-bold text-green-400">
            {status.freePlayAmount.toFixed(2)} USDm
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">Multiplier</p>
          <p className="text-lg font-bold text-yellow-400">
            {status.multiplier.toFixed(1)}x
          </p>
        </div>
      </div>

      <button
        onClick={handleClaim}
        disabled={!status.eligible || claiming}
        className={`w-full px-4 py-2 rounded-lg font-semibold transition ${
          status.eligible
            ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white"
            : "bg-slate-700 text-slate-400 cursor-not-allowed"
        }`}
      >
        {claiming
          ? "Claiming..."
          : status.eligible
            ? "Claim Free Play"
            : `Available in ${Math.ceil(
                (new Date(status.nextAvailable!).getTime() - Date.now()) /
                  (60 * 60 * 1000)
              )}h`}
      </button>
    </div>
  );
}

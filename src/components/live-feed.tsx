"use client";

import { useEffect, useState } from "react";

interface WinEvent {
  winner: string;
  amount: number;
  type: string;
  timestamp: string;
}

export function LiveFeed() {
  const [feed, setFeed] = useState<WinEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const res = await fetch("/api/live-feed?limit=10");
        const data = await res.json();
        setFeed(data.data.feed);
      } catch (error) {
        console.error("Failed to fetch live feed:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchFeed, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="text-slate-400 text-sm">Loading live feed...</div>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      <h3 className="text-sm font-semibold text-purple-400 mb-3">
        ⚡ Live Wins
      </h3>
      {feed.length === 0 ? (
        <p className="text-slate-500 text-sm">No recent wins yet</p>
      ) : (
        feed.map((win, idx) => (
          <div
            key={idx}
            className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 text-sm hover:bg-slate-800 transition"
          >
            <div className="flex justify-between items-start">
              <span className="text-slate-300">
                <span className="font-mono text-purple-400">
                  {win.winner.slice(0, 6)}...{win.winner.slice(-4)}
                </span>{" "}
                won{" "}
                <span className="text-green-400 font-semibold">
                  {win.amount.toFixed(2)} USDm
                </span>
              </span>
              <span className="text-slate-500 text-xs">
                {new Date(win.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {win.type === "arena" ? "🏟️ Arena" : "🎮 Solo"}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

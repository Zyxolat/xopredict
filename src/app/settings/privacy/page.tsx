"use client";

import { Lock } from "lucide-react";

export default function PrivacySettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 backdrop-blur-md">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Lock size={20} className="text-[#d5a7ff]" /> Privacy Settings
        </h2>

        <div className="mt-6 space-y-4 font-mono text-xs">
          {[
            { id: "leaderboard", label: "Show profile on public Leaderboards", defaultChecked: true },
            { id: "stats", label: "Allow others to inspect match history", defaultChecked: true },
          ].map((item) => (
            <label
              key={item.id}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 p-4 cursor-pointer hover:bg-black/60 transition"
            >
              <span className="text-white font-bold">{item.label}</span>
              <input
                type="checkbox"
                defaultChecked={item.defaultChecked}
                className="h-4 w-4 rounded accent-[#d5a7ff]"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

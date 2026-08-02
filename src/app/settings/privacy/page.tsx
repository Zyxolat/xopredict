"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";

type PrivacyPrefs = {
  showOnLeaderboard: boolean;
  allowMatchHistoryView: boolean;
};

const ITEMS: { key: keyof PrivacyPrefs; label: string }[] = [
  { key: "showOnLeaderboard", label: "Show profile on public Leaderboards" },
  { key: "allowMatchHistoryView", label: "Allow others to inspect match history" },
];

export default function PrivacySettingsPage() {
  const [prefs, setPrefs] = useState<PrivacyPrefs | null>(null);
  const [saving, setSaving] = useState<keyof PrivacyPrefs | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/preferences")
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setPrefs(json.data);
      })
      .catch((err) => console.error("Preferences fetch error:", err));
  }, []);

  const toggle = async (key: keyof PrivacyPrefs) => {
    if (!prefs) return;
    const next = !prefs[key];
    setPrefs({ ...prefs, [key]: next });
    setSaving(key);
    setError(null);
    try {
      const res = await fetch("/api/settings/preferences", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [key]: next }),
      });
      if (!res.ok) throw new Error("Failed to save");
    } catch (err) {
      console.error("Preferences save error:", err);
      setPrefs((prev) => (prev ? { ...prev, [key]: !next } : prev));
      setError("Failed to save preference. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 backdrop-blur-md">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Lock size={20} className="text-[#d5a7ff]" /> Privacy Settings
        </h2>

        {error && (
          <p className="mt-3 rounded-xl border border-red-400/40 bg-red-400/10 p-3 font-mono text-xs text-red-300">
            {error}
          </p>
        )}

        <div className="mt-6 space-y-4 font-mono text-xs">
          {ITEMS.map((item) => (
            <label
              key={item.key}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 p-4 cursor-pointer hover:bg-black/60 transition"
            >
              <span className="text-white font-bold">{item.label}</span>
              <input
                type="checkbox"
                checked={prefs ? prefs[item.key] : false}
                disabled={!prefs || saving === item.key}
                onChange={() => toggle(item.key)}
                className="h-4 w-4 rounded accent-[#d5a7ff] disabled:opacity-50"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

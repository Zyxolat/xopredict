"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { UserCheck, Mail } from "lucide-react";

export default function AccountSettingsPage() {
  const { data: session, update } = useSession();

  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      setDisplayName(session.user.displayName || session.user.name || "");
    }
  }, [session]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      await update({ displayName });
      setMessage("Account details updated successfully");
    } catch {
      setMessage("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 backdrop-blur-md">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <UserCheck size={20} className="text-[#d5a7ff]" /> Account Information
        </h2>

        {message && (
          <div className="mt-4 rounded-xl border border-[#4ce47d]/30 bg-[#4ce47d]/10 p-3 font-mono text-xs text-[#4ce47d]">
            {message}
          </div>
        )}

        <form onSubmit={handleSave} className="mt-6 space-y-4 font-sans">
          <div>
            <label className="block font-mono text-xs text-[#d8cadd] mb-1.5">
              EMAIL ADDRESS (Primary Identity)
            </label>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/50 px-4 py-3 font-mono text-sm text-[#a79cae]">
              <span className="flex items-center gap-2">
                <Mail size={16} /> {session?.user?.email}
              </span>
              <span className="rounded-full bg-[#4ce47d]/10 border border-[#4ce47d]/30 px-3 py-1 text-[10px] font-bold text-[#4ce47d]">
                VERIFIED
              </span>
            </div>
          </div>

          <div>
            <label className="block font-mono text-xs text-[#d8cadd] mb-1.5">
              USERNAME (Public Identifier - Cannot be changed)
            </label>
            <input
              type="text"
              disabled
              value={session?.user?.username || ""}
              className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 font-mono text-sm text-[#a79cae] cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block font-mono text-xs text-[#d8cadd] mb-1.5">
              DISPLAY NAME (Shown across leaderboards & gameplay)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 font-mono text-sm text-white focus:border-[#d5a7ff] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="rounded-2xl bg-[#d5a7ff] px-6 py-3 font-bold text-black hover:bg-[#c490fa] transition disabled:opacity-50"
          >
            {isSaving ? "SAVING..." : "SAVE CHANGES"}
          </button>
        </form>
      </div>
    </div>
  );
}

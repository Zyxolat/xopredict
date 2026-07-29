"use client";

import { useState } from "react";
import { Shield } from "lucide-react";

export default function SecuritySettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to change password");
      }

      setSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 backdrop-blur-md">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Shield size={20} className="text-[#d5a7ff]" /> Password & Security
        </h2>
        <p className="mt-1 text-xs text-[#a79cae]">
          Update your account password using Argon2id-grade protection
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 font-mono text-xs text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 rounded-xl border border-[#4ce47d]/30 bg-[#4ce47d]/10 p-3 font-mono text-xs text-[#4ce47d]">
            {success}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="mt-6 space-y-4">
          <div>
            <label className="block font-mono text-xs text-[#d8cadd] mb-1.5">
              CURRENT PASSWORD
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 font-mono text-sm text-white focus:border-[#d5a7ff] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-mono text-xs text-[#d8cadd] mb-1.5">
              NEW PASSWORD
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 font-mono text-sm text-white focus:border-[#d5a7ff] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-mono text-xs text-[#d8cadd] mb-1.5">
              CONFIRM NEW PASSWORD
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 font-mono text-sm text-white focus:border-[#d5a7ff] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="rounded-2xl bg-[#d5a7ff] px-6 py-3 font-bold text-black hover:bg-[#c490fa] transition disabled:opacity-50"
          >
            {isSaving ? "UPDATING..." : "UPDATE PASSWORD"}
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("reset_email");
    if (saved) setEmail(saved);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || otp.length !== 6 || !newPassword) return;

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          newPassword,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Reset failed");
      }

      setSuccess(json.message);
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#07050a] font-sans text-white flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(213,167,255,0.15),transparent_60%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/15 bg-white/[0.03] p-8 backdrop-blur-xl shadow-2xl"
      >
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#4ce47d]/30 bg-[#4ce47d]/10 text-[#4ce47d]">
            <Lock size={32} />
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-white">
            SET NEW PASSWORD
          </h1>
          <p className="mt-1 text-xs text-[#a79cae]">
            Enter the 6-digit OTP code and your new password
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 font-mono text-xs text-red-300 text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-[#4ce47d]/30 bg-[#4ce47d]/10 p-4 font-mono text-xs text-[#4ce47d] text-center">
            <CheckCircle2 size={16} /> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block font-mono text-xs text-[#d8cadd] mb-1.5">
              ACCOUNT EMAIL
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="player@example.com"
              className="w-full rounded-2xl border border-white/15 bg-black/40 py-3.5 px-4 font-mono text-sm text-white focus:border-[#d5a7ff] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-mono text-xs text-[#d8cadd] mb-1.5">
              6-DIGIT OTP CODE
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="123456"
              className="w-full rounded-2xl border border-white/20 bg-black/60 py-3.5 text-center font-mono text-xl tracking-[8px] text-[#d5a7ff] focus:border-[#d5a7ff] focus:outline-none"
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
              placeholder="••••••••••••"
              className="w-full rounded-2xl border border-white/15 bg-black/40 py-3.5 px-4 font-mono text-sm text-white focus:border-[#d5a7ff] focus:outline-none"
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
              placeholder="••••••••••••"
              className="w-full rounded-2xl border border-white/15 bg-black/40 py-3.5 px-4 font-mono text-sm text-white focus:border-[#d5a7ff] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || otp.length !== 6 || !newPassword}
            className="w-full rounded-2xl bg-[#4ce47d] py-4 font-bold text-black shadow-lg shadow-[#4ce47d]/20 hover:scale-[1.01] active:scale-[0.98] transition disabled:opacity-50"
          >
            {isLoading ? "RESETTING..." : "RESET PASSWORD"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-[#a79cae]">
          <Link href="/login" className="font-bold text-[#d5a7ff] hover:underline">
            Back to Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

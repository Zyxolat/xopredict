"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { MailCheck, RefreshCw, CheckCircle2 } from "lucide-react";

export default function VerifyEmailPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    const saved = sessionStorage.getItem("verify_email");
    if (saved) setEmail(saved);
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || otp.length !== 6) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Verification failed");
      }

      setSuccess("Email verified successfully! Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || resendCooldown > 0) return;
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to resend code");
      }

      setSuccess("New 6-digit verification code sent to your email!");
      setResendCooldown(60);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
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
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#d5a7ff]/30 bg-[#d5a7ff]/10 text-[#d5a7ff]">
            <MailCheck size={32} />
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-white">
            VERIFY EMAIL
          </h1>
          <p className="mt-2 text-xs text-[#a79cae]">
            Enter the 6-digit verification code sent to <br />
            <strong className="text-white font-mono">{email || "your email"}</strong>
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

        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          {!email && (
            <div>
              <label className="block font-mono text-xs text-[#d8cadd] mb-1.5">
                EMAIL ADDRESS
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
          )}

          <div>
            <label className="block font-mono text-xs text-[#d8cadd] mb-1.5 text-center">
              ENTER 6-DIGIT CODE
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="123456"
              className="w-full rounded-2xl border border-white/20 bg-black/60 py-4 text-center font-mono text-3xl tracking-[12px] text-[#d5a7ff] focus:border-[#d5a7ff] focus:outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || otp.length !== 6}
            className="w-full rounded-2xl bg-[#4ce47d] py-4 font-bold text-black shadow-lg shadow-[#4ce47d]/20 hover:scale-[1.01] active:scale-[0.98] transition disabled:opacity-50"
          >
            {isLoading ? "VERIFYING..." : "VERIFY EMAIL"}
          </button>
        </form>

        <div className="mt-6 flex justify-between items-center font-mono text-xs border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="flex items-center gap-1.5 text-[#d5a7ff] hover:underline disabled:opacity-40"
          >
            <RefreshCw size={12} />
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
          </button>
          <Link href="/login" className="text-[#a79cae] hover:text-white">
            Back to Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

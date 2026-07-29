"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { KeyRound, Mail, ArrowRight } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to send reset code");
      }

      sessionStorage.setItem("reset_email", email.trim());
      setMessage(json.message);
      setTimeout(() => {
        router.push("/reset-password");
      }, 2000);
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
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#d5a7ff]/30 bg-[#d5a7ff]/10 text-[#d5a7ff]">
            <KeyRound size={32} />
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-white">
            RECOVER PASSWORD
          </h1>
          <p className="mt-1 text-xs text-[#a79cae]">
            Enter your account email to receive a password reset OTP
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 font-mono text-xs text-red-300 text-center">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-2xl border border-[#4ce47d]/30 bg-[#4ce47d]/10 p-4 font-mono text-xs text-[#4ce47d] text-center">
            {message} Redirecting to reset page...
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block font-mono text-xs text-[#d8cadd] mb-1.5">
              ACCOUNT EMAIL
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 h-5 w-5 text-[#8e8892]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="player@example.com"
                className="w-full rounded-2xl border border-white/15 bg-black/40 py-3.5 pl-12 pr-4 font-mono text-sm text-white focus:border-[#d5a7ff] focus:outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#d5a7ff] to-[#4ce47d] py-4 font-bold text-black shadow-lg shadow-[#d5a7ff]/20 hover:scale-[1.01] active:scale-[0.98] transition disabled:opacity-50"
          >
            {isLoading ? "SENDING..." : <>SEND RESET OTP <ArrowRight size={18} /></>}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-[#a79cae]">
          Remember your password?{" "}
          <Link href="/login" className="font-bold text-[#d5a7ff] hover:underline">
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

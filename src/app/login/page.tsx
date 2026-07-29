"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, Mail, ArrowRight, Sparkles } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error);
        setIsLoading(false);
      } else if (res?.ok) {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    await signIn("google", { callbackUrl });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative z-10 w-full max-w-md rounded-3xl border border-white/15 bg-white/[0.03] p-8 backdrop-blur-xl shadow-2xl"
    >
      {/* Brand Header */}
      <div className="text-center">
        <Link href="/" className="inline-flex items-center gap-2 font-mono text-xs tracking-[.2em] text-[#d5a7ff]">
          <Sparkles size={16} /> XOLAT GAMING PLATFORM
        </Link>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
          WELCOME BACK
        </h1>
        <p className="mt-1 text-xs text-[#a79cae]">
          Sign in with your verified account credentials
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center font-mono text-xs text-red-300"
        >
          {error}
        </motion.div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block font-mono text-xs text-[#d8cadd] mb-1.5">
            EMAIL ADDRESS
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 h-5 w-5 text-[#8e8892]" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="player@example.com"
              className="w-full rounded-2xl border border-white/15 bg-black/40 py-3.5 pl-12 pr-4 font-mono text-sm text-white placeholder-[#6e6878] focus:border-[#d5a7ff] focus:outline-none transition"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="font-mono text-xs text-[#d8cadd]">
              PASSWORD
            </label>
            <Link
              href="/forgot-password"
              className="font-mono text-xs text-[#d5a7ff] hover:underline"
            >
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-3.5 h-5 w-5 text-[#8e8892]" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-2xl border border-white/15 bg-black/40 py-3.5 pl-12 pr-4 font-mono text-sm text-white placeholder-[#6e6878] focus:border-[#d5a7ff] focus:outline-none transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#d5a7ff] to-[#4ce47d] py-4 font-bold text-black shadow-lg shadow-[#d5a7ff]/20 hover:scale-[1.01] active:scale-[0.98] transition disabled:opacity-50"
        >
          {isLoading ? (
            <span className="font-mono text-xs">AUTHENTICATING...</span>
          ) : (
            <>
              SIGN IN <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="font-mono text-[10px] tracking-widest text-[#8e8892]">OR</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* Google Sign-in */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/[0.04] py-3.5 font-mono text-xs font-bold text-white hover:bg-white/10 transition"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="#EA4335"
            d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
          />
          <path
            fill="#4285F4"
            d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
          />
          <path
            fill="#FBBC05"
            d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"
          />
          <path
            fill="#34A853"
            d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
          />
        </svg>
        CONTINUE WITH GOOGLE
      </button>

      {/* Footer */}
      <p className="mt-8 text-center text-xs text-[#a79cae]">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-bold text-[#d5a7ff] hover:underline">
          Create Account
        </Link>
      </p>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#07050a] font-sans text-white flex items-center justify-center p-4">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(213,167,255,0.15),transparent_60%)] pointer-events-none" />
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[#d5a7ff]/10 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#4ce47d]/10 blur-[120px] pointer-events-none" />

      <Suspense fallback={<div className="font-mono text-xs text-[#d5a7ff]">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

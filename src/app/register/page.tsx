"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, User, Sparkles, ArrowRight, CheckCircle2, XCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");

  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Real-time username availability check (debounced)
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      setUsernameError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameChecking(true);
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
        const json = await res.json();
        if (json.available) {
          setUsernameAvailable(true);
          setUsernameError(null);
        } else {
          setUsernameAvailable(false);
          setUsernameError(json.error || "Username is unavailable");
        }
      } catch {
        setUsernameAvailable(null);
      } finally {
        setUsernameChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !username || !password || usernameAvailable === false) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          username: username.trim(),
          displayName: displayName.trim() || username.trim(),
          password,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Registration failed");
      }

      // Store email in sessionStorage for verification page
      sessionStorage.setItem("verify_email", email.trim());
      router.push("/verify-email");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#07050a] font-sans text-white flex items-center justify-center p-4">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(213,167,255,0.15),transparent_60%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/15 bg-white/[0.03] p-8 backdrop-blur-xl shadow-2xl"
      >
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 font-mono text-xs tracking-[.2em] text-[#d5a7ff]">
            <Sparkles size={16} /> XOLAT GAMING PLATFORM
          </Link>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
            CREATE ACCOUNT
          </h1>
          <p className="mt-1 text-xs text-[#a79cae]">
            Register your player profile with email & password
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 font-mono text-xs text-red-300 text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block font-mono text-xs text-[#d8cadd] mb-1.5">
              EMAIL ADDRESS *
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
            <label className="block font-mono text-xs text-[#d8cadd] mb-1.5">
              USERNAME * (Public Identity)
            </label>
            <div className="relative">
              <User className="absolute left-4 top-3.5 h-5 w-5 text-[#8e8892]" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                placeholder="HenryX"
                maxLength={20}
                className="w-full rounded-2xl border border-white/15 bg-black/40 py-3.5 pl-12 pr-10 font-mono text-sm text-white placeholder-[#6e6878] focus:border-[#d5a7ff] focus:outline-none transition"
              />
              <div className="absolute right-4 top-3.5">
                {usernameChecking ? (
                  <span className="font-mono text-xs text-yellow-400">...</span>
                ) : usernameAvailable === true ? (
                  <CheckCircle2 className="h-5 w-5 text-[#4ce47d]" />
                ) : usernameAvailable === false ? (
                  <XCircle className="h-5 w-5 text-red-400" />
                ) : null}
              </div>
            </div>
            {usernameError && (
              <p className="mt-1 font-mono text-[10px] text-red-300">{usernameError}</p>
            )}
          </div>

          <div>
            <label className="block font-mono text-xs text-[#d8cadd] mb-1.5">
              DISPLAY NAME (Optional)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="King Henry"
              maxLength={50}
              className="w-full rounded-2xl border border-white/15 bg-black/40 py-3.5 px-4 font-mono text-sm text-white placeholder-[#6e6878] focus:border-[#d5a7ff] focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block font-mono text-xs text-[#d8cadd] mb-1.5">
              PASSWORD * (Min 8 characters, A-Z, 0-9)
            </label>
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
            disabled={isLoading || usernameAvailable === false}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#d5a7ff] to-[#4ce47d] py-4 font-bold text-black shadow-lg shadow-[#d5a7ff]/20 hover:scale-[1.01] active:scale-[0.98] transition disabled:opacity-50"
          >
            {isLoading ? (
              <span className="font-mono text-xs">CREATING ACCOUNT...</span>
            ) : (
              <>
                REGISTER ACCOUNT <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-[#a79cae]">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-[#d5a7ff] hover:underline">
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

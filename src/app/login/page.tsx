"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ConnectButton } from "@/components/connect-button";
import { XolatLogo } from "@/components/xolat-logo";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useEffect } from "react";
import { Mail, Globe, Wallet } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8 },
  },
};

const logoVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 1 },
  },
};

const glowVariants = {
  visible: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 3,
      repeat: Infinity,
    },
  },
};

export default function LoginPage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const [authMethod, setAuthMethod] = useState<"wallet" | "google" | "email">("wallet");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    await signIn("google", { redirect: true, callbackUrl: "/" });
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      
      if (result?.ok) {
        router.push("/");
      } else {
        // For email provider, NextAuth sends a magic link
        await signIn("email", {
          email,
          redirect: true,
          callbackUrl: "/",
        });
      }
    } catch (error) {
      console.error("Sign in failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080709] text-[#f4eef8]">
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-[#d5a7ff]/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-[#8d739c]/10 blur-3xl" />
      </div>

      {/* Content */}
      <motion.div
        className="relative flex min-h-screen flex-col items-center justify-center px-5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo Section */}
        <motion.div
          className="mb-12 flex flex-col items-center"
          variants={itemVariants}
        >
          <motion.div
            className="mb-8 flex items-center justify-center"
            variants={logoVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={glowVariants} initial="hidden" animate="visible">
              <XolatLogo className="w-80 h-56" />
            </motion.div>
          </motion.div>

          <motion.h1
            className="text-center text-4xl font-black tracking-tighter md:text-5xl"
            variants={itemVariants}
            style={{
              background: "linear-gradient(135deg, #d5a7ff 0%, #8d739c 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            XOLAT
          </motion.h1>

          <motion.p
            className="mt-3 max-w-md text-center text-sm tracking-wide text-[#b8a4c4]"
            variants={itemVariants}
          >
            The next-generation USDm prediction arena on Celo. Play, predict, and earn.
          </motion.p>
        </motion.div>

        {/* Auth Methods Tabs */}
        <motion.div
          className="mb-8 w-full max-w-md flex gap-2 justify-center"
          variants={itemVariants}
        >
          <button
            onClick={() => setAuthMethod("wallet")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs tracking-wider transition ${
              authMethod === "wallet"
                ? "bg-[#d5a7ff] text-black"
                : "bg-[#2a2332] text-[#b8a4c4] hover:bg-[#3a3342]"
            }`}
          >
            <Wallet size={16} />
            WALLET
          </button>
          <button
            onClick={() => setAuthMethod("google")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs tracking-wider transition ${
              authMethod === "google"
                ? "bg-[#d5a7ff] text-black"
                : "bg-[#2a2332] text-[#b8a4c4] hover:bg-[#3a3342]"
            }`}
          >
            <Globe size={16} />
            GOOGLE
          </button>
          <button
            onClick={() => setAuthMethod("email")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs tracking-wider transition ${
              authMethod === "email"
                ? "bg-[#d5a7ff] text-black"
                : "bg-[#2a2332] text-[#b8a4c4] hover:bg-[#3a3342]"
            }`}
          >
            <Mail size={16} />
            EMAIL
          </button>
        </motion.div>

        {/* Auth Content */}
        <motion.div
          className="w-full max-w-md rounded-lg border border-[#8d739c]/40 bg-[#0b0a0d]/50 px-6 py-8 backdrop-blur"
          variants={itemVariants}
        >
          {authMethod === "wallet" && (
            <div className="space-y-4">
              <p className="text-xs text-[#b8a4c4] text-center mb-4">
                Connect your Web3 wallet to play Xolat
              </p>
              <ConnectButton />
            </div>
          )}

          {authMethod === "google" && (
            <div className="space-y-4">
              <p className="text-xs text-[#b8a4c4] text-center mb-6">
                Sign in with your Google account
              </p>
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-white text-black py-3 font-semibold hover:bg-gray-100 disabled:opacity-50 transition"
              >
                <Globe size={18} />
                {isLoading ? "SIGNING IN..." : "SIGN IN WITH GOOGLE"}
              </button>
            </div>
          )}

          {authMethod === "email" && (
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#b8a4c4] mb-2 tracking-wide">
                  EMAIL
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 rounded-lg bg-[#1a1820] border border-[#8d739c]/30 text-white placeholder-[#8d739c] focus:outline-none focus:border-[#d5a7ff]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-[#b8a4c4] mb-2 tracking-wide">
                  PASSWORD
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 rounded-lg bg-[#1a1820] border border-[#8d739c]/30 text-white placeholder-[#8d739c] focus:outline-none focus:border-[#d5a7ff]"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !email || !password}
                className="w-full py-3 bg-gradient-to-r from-[#d5a7ff] to-[#8d739c] text-black font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition"
              >
                {isLoading ? "SIGNING IN..." : "SIGN IN"}
              </button>
            </form>
          )}
        </motion.div>

        {/* Footer Links */}
        <motion.div
          className="mt-12 flex flex-wrap justify-center gap-6 text-xs text-[#8d739c]"
          variants={itemVariants}
        >
          <Link href="#" className="hover:text-[#d5a7ff] transition">
            Terms of Service
          </Link>
          <span>•</span>
          <Link href="#" className="hover:text-[#d5a7ff] transition">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="#" className="hover:text-[#d5a7ff] transition">
            Contact
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}

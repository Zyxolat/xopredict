"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { AppShell } from "@/components/app-shell";
import { VIPPass } from "@/components/vip-pass";
import { CosmeticsShop } from "@/components/cosmetics-shop";
import { Wallet, Calendar, CheckCircle2 } from "lucide-react";

interface UserProfileData {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  emailVerified: string | null;
  createdAt: string;
  player: {
    id: string;
    totalWonUsdm: number;
    totalPlayed: number;
    streakDays: number;
    rank: string;
    vipExpiresAt: string | null;
    seasonXp?: Array<{ xp: number }>;
  } | null;
  wallets: Array<{
    id: string;
    address: string;
    walletType: string;
    isPrimary: boolean;
  }>;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "vip" | "cosmetics">("overview");

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/players/me");
        if (res.ok) {
          const json = await res.json();
          setProfile(json.data);
        }
      } catch (err) {
        console.error("Profile fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      void fetchProfile();
    } else {
      setLoading(false);
    }
  }, [session]);

  const username = profile?.username || session?.user?.username || "Player";
  const displayName = profile?.displayName || session?.user?.displayName || username;
  const isEmailVerified = !!profile?.emailVerified || !!session?.user?.emailVerified;
  const xp = profile?.player?.seasonXp?.[0]?.xp || 0;
  const rank = profile?.player?.rank || "Bronze";
  const memberSince = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "2026";

  return (
    <AppShell title="Player Profile">
      <motion.section
        className="mx-auto max-w-4xl px-5 pt-4 pb-20 space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header Profile Card */}
        <motion.div
          className="rounded-3xl border border-white/15 bg-gradient-to-br from-[#1c1429] via-[#0d0914] to-black p-8 shadow-2xl"
          variants={itemVariants}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-[#d5a7ff]/40 bg-[#d5a7ff]/10 text-3xl font-black text-[#d5a7ff] shadow-lg">
                {displayName.charAt(0).toUpperCase()}
                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-black bg-[#4ce47d]" title="Online" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-black text-white">{displayName}</h1>
                  {isEmailVerified && (
                    <span className="flex items-center gap-1 rounded-full bg-[#4ce47d]/10 border border-[#4ce47d]/40 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#4ce47d]" title="Email Verified">
                      <CheckCircle2 size={12} /> VERIFIED
                    </span>
                  )}
                </div>

                <p className="font-mono text-xs text-[#d5a7ff] mt-0.5">@{username}</p>

                <div className="mt-2 flex flex-wrap items-center gap-4 font-mono text-xs text-[#a79cae]">
                  <span>RANK: <strong className="text-yellow-400 font-bold">{rank}</strong></span>
                  <span>XP: <strong className="text-[#d5a7ff]">{xp}</strong></span>
                  <span className="flex items-center gap-1"><Calendar size={12} /> Joined {memberSince}</span>
                </div>
              </div>
            </div>

            <Link
              href="/settings/account"
              className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 font-mono text-xs font-bold text-[#d5a7ff] hover:bg-white/10 transition"
            >
              EDIT PROFILE
            </Link>
          </div>
        </motion.div>

        {/* Linked Wallets Summary Bar */}
        <motion.div
          className="rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-xs flex flex-wrap items-center justify-between gap-3"
          variants={itemVariants}
        >
          <div className="flex items-center gap-2 text-[#d8cadd]">
            <Wallet size={16} className="text-[#d5a7ff]" />
            <span>LINKED WALLETS:</span>
            <strong className="text-white">
              {profile?.wallets?.length ? `${profile.wallets.length} Linked` : "None Linked"}
            </strong>
          </div>
          <Link
            href="/settings/wallets"
            className="text-[#d5a7ff] hover:underline flex items-center gap-1 font-bold"
          >
            MANAGE WALLETS →
          </Link>
        </motion.div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 font-mono text-xs">
          {[
            { id: "overview", label: "STATISTICS OVERVIEW" },
            { id: "vip", label: "VIP PASS" },
            { id: "cosmetics", label: "COSMETICS SHOP" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "overview" | "vip" | "cosmetics")}
              className={`px-5 py-3 border-b-2 font-bold transition ${
                activeTab === tab.id
                  ? "border-[#d5a7ff] text-[#d5a7ff]"
                  : "border-transparent text-[#8e8892] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Stats Overview */}
        {activeTab === "overview" && (
          <motion.div className="space-y-6" variants={itemVariants}>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-5">
                <strong className="text-2xl font-black text-[#4ce47d]">
                  {loading ? "..." : Number(profile?.player?.totalWonUsdm || 0).toFixed(2)}
                </strong>
                <p className="mt-2 font-mono text-[10px] tracking-[.1em] text-[#d8cadd]">
                  TOTAL USDm WON
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-5">
                <strong className="text-2xl font-black text-[#d5a7ff]">
                  {loading ? "..." : profile?.player?.totalPlayed || 0}
                </strong>
                <p className="mt-2 font-mono text-[10px] tracking-[.1em] text-[#d8cadd]">
                  ROUNDS PLAYED
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-5">
                <strong className="text-2xl font-black text-yellow-400">
                  {loading ? "..." : profile?.player?.streakDays || 0} DAYS
                </strong>
                <p className="mt-2 font-mono text-[10px] tracking-[.1em] text-[#d8cadd]">
                  WIN STREAK
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 font-mono text-xs">
              <Link
                href="/history"
                className="rounded-2xl border border-white/15 bg-white/5 px-6 py-3 text-[#d5a7ff] hover:bg-white/10 transition"
              >
                VIEW ROUND HISTORY →
              </Link>
              <Link
                href="/leaderboard"
                className="text-[#4ce47d] hover:underline"
              >
                SEASON LEADERBOARD →
              </Link>
            </div>
          </motion.div>
        )}

        {/* Tab 2: VIP Pass */}
        {activeTab === "vip" && (
          <motion.div variants={itemVariants}>
            <VIPPass />
          </motion.div>
        )}

        {/* Tab 3: Cosmetics Shop */}
        {activeTab === "cosmetics" && (
          <motion.div variants={itemVariants}>
            <CosmeticsShop />
          </motion.div>
        )}
      </motion.section>
    </AppShell>
  );
}

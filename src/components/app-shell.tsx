"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Gamepad2, History, LayoutDashboard, ShieldCheck, Trophy, UserRound, Award, Settings, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ConnectButton } from "@/components/connect-button";

const links = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/arena", label: "Arena", icon: Gamepad2 },
  { href: "/solo", label: "Solo", icon: Trophy },
  { href: "/leaderboard", label: "Ranks", icon: Award },
  { href: "/history", label: "History", icon: History },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

const titleVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5 },
  },
};

export function AppShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const path = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const isHome = path === "/";

  return (
    <main className="min-h-screen bg-[#080709] pb-24 text-[#f4eef8]">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0a0d]/90 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            {!isHome && title && (
              <motion.button
                onClick={() => router.back()}
                className="text-[#d5a7ff] hover:text-white transition"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft size={24} />
              </motion.button>
            )}
            <Link href="/" className="text-2xl font-black italic tracking-[-.08em] text-[#d6a8ff]">
              ⬡ XOLAT
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {session?.user && (
              <div className="hidden sm:flex items-center gap-2 font-mono text-xs text-[#a79cae]">
                <span className="font-bold text-white">
                  {session.user.displayName || session.user.username || session.user.name}
                </span>
                {session.user.role === "ADMIN" && (
                  <Link href="/admin" className="rounded bg-red-500/20 border border-red-500/40 px-2 py-0.5 text-[10px] font-bold text-red-300">
                    ADMIN
                  </Link>
                )}
              </div>
            )}
            {session?.user && (
              <button
                onClick={() => void signOut({ callbackUrl: "/login" })}
                className="hidden md:flex items-center gap-1.5 font-mono text-xs text-[#a79cae] hover:text-red-300 transition"
                title="Sign out"
              >
                <LogOut size={14} /> SIGN OUT
              </button>
            )}
            <ConnectButton />
          </div>
        </div>
      </header>

      {title && (
        <motion.div
          className="mx-auto max-w-6xl px-5 pt-7"
          variants={titleVariants}
          initial="hidden"
          animate="visible"
        >
          <h1 className="text-3xl font-bold text-[#d5a7ff]">{title}</h1>
        </motion.div>
      )}

      {children}

      <motion.div
        className="mx-auto mt-8 flex max-w-6xl justify-center gap-4 font-mono text-[10px] tracking-[.15em] text-[#4ce47d]"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} /> PROVABLY FAIR • CELO • USDm ONLY
        </div>
        <Link href="/verify" className="underline hover:text-white transition">
          VERIFY FAIRNESS
        </Link>
      </motion.div>

      <nav className="fixed bottom-0 z-30 flex w-full justify-around border border-white/15 bg-[#0c0b0e]/95 px-3 py-3 backdrop-blur-xl">
        {links.map(({ href, label, icon: Icon }) => (
          <motion.div
            key={href}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link
              href={href}
              className={`flex min-w-12 flex-col items-center gap-1 font-mono text-[10px] tracking-[.08em] transition ${
                path === href || (href !== "/" && path.startsWith(href)) ? "text-[#d5a7ff]" : "text-[#8e8892] hover:text-[#d5a7ff]"
              }`}
            >
              <Icon size={20} />
              {label.toUpperCase()}
            </Link>
          </motion.div>
        ))}
      </nav>
    </main>
  );
}

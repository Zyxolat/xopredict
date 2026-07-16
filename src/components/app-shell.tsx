"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Gamepad2, History, ShieldCheck, Trophy, UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ConnectButton } from "@/components/connect-button";
import { UserProfile } from "@/components/user-profile";
import { useWalletPersistence } from "@/lib/hooks/useWalletPersistence";

const links = [
  { href: "/", label: "Arena", icon: Gamepad2 },
  { href: "/solo", label: "Solo", icon: Trophy },
  { href: "/history", label: "History", icon: History },
  { href: "/profile", label: "Profile", icon: UserRound },
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
  const isHome = path === "/";
  const { data: session } = useSession();
  const { isConnected } = useWalletPersistence();

  const isAuthenticated = !!session || isConnected;

  return (
    <main className="min-h-screen bg-[#080709] pb-24 text-[#f4eef8]">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0a0d]/90 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
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
            {isAuthenticated ? (
              <UserProfile />
            ) : (
              <ConnectButton />
            )}
          </div>
        </div>
      </header>

      {title && (
        <motion.div
          className="mx-auto max-w-5xl px-5 pt-7"
          variants={titleVariants}
          initial="hidden"
          animate="visible"
        >
          <h1 className="text-3xl font-bold text-[#d5a7ff]">{title}</h1>
        </motion.div>
      )}

      {children}

      <motion.div
        className="mx-auto mt-8 flex max-w-5xl justify-center gap-2 font-mono text-[10px] tracking-[.15em] text-[#4ce47d]"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <ShieldCheck size={14} /> PROVABLY FAIR • CELO • USDm ONLY
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
              className={`flex min-w-14 flex-col items-center gap-1 font-mono text-[10px] tracking-[.08em] transition ${
                path === href ? "text-[#d5a7ff]" : "text-[#8e8892] hover:text-[#d5a7ff]"
              }`}
            >
              <Icon size={21} />
              {label.toUpperCase()}
            </Link>
          </motion.div>
        ))}
      </nav>
    </main>
  );
}

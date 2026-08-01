"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Gamepad2,
  History,
  LayoutDashboard,
  ShieldCheck,
  Trophy,
  UserRound,
  Award,
  Settings,
  LogOut,
  Wallet,
  Bell,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ConnectButton } from "@/components/connect-button";
import { useState, useRef, useEffect } from "react";

const navLinks = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/arena", label: "Arena", icon: Gamepad2 },
  { href: "/solo", label: "Solo", icon: Trophy },
  { href: "/leaderboard", label: "Ranks", icon: Award },
  { href: "/history", label: "History", icon: History },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

const dropdownLinks = [
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/history", label: "History", icon: History },
  { href: "/leaderboard", label: "Leaderboard", icon: Award },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/settings/wallets", label: "Linked Wallets", icon: Wallet },
];

const titleVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
};

// ── UserDropdown ──────────────────────────────────────────

function UserDropdown() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const displayName =
    session?.user?.displayName ||
    session?.user?.username ||
    session?.user?.name ||
    "Player";

  const initial = displayName.charAt(0).toUpperCase();

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-2 hover:bg-white/10 transition"
        aria-label="User menu"
      >
        {/* Avatar */}
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#d5a7ff] to-[#a855f7] text-xs font-black text-black">
          {initial}
        </div>
        <span className="hidden sm:block font-mono text-xs font-bold text-white max-w-[120px] truncate">
          {displayName}
        </span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} className="text-[#a79cae]" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-52 rounded-2xl border border-white/15 bg-[#13111a]/95 p-2 shadow-2xl backdrop-blur-xl z-50"
          >
            {/* User info header */}
            <div className="px-3 py-3 border-b border-white/10 mb-2">
              <p className="font-bold text-sm text-white truncate">{displayName}</p>
              {session?.user?.email && (
                <p className="font-mono text-[10px] text-[#8e8892] truncate mt-0.5">
                  {session.user.email}
                </p>
              )}
              {session?.user?.role === "ADMIN" && (
                <span className="mt-1 inline-flex rounded bg-red-500/20 border border-red-500/40 px-2 py-0.5 text-[9px] font-bold text-red-300">
                  ADMIN
                </span>
              )}
            </div>

            {/* Nav links */}
            {dropdownLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-mono text-xs text-[#c4b6cc] hover:bg-white/8 hover:text-white transition"
              >
                <Icon size={14} className="text-[#d5a7ff]" />
                {label}
              </Link>
            ))}

            {/* Logout */}
            <div className="mt-2 pt-2 border-t border-white/10">
              <button
                onClick={() => { setOpen(false); void signOut({ callbackUrl: "/login" }); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-mono text-xs text-red-300 hover:bg-red-500/10 transition"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── MobileMenu ────────────────────────────────────────────

function MobileMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={onClose}
          />
          <motion.nav
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-72 z-50 bg-[#0f0d15] border-l border-white/10 p-6 overflow-y-auto md:hidden"
          >
            <div className="flex items-center justify-between mb-8">
              <span className="font-black italic text-xl text-[#d6a8ff]">⬡ XOLAT</span>
              <button onClick={onClose} className="text-[#a79cae] hover:text-white transition">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-1">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 font-mono text-xs text-[#c4b6cc] hover:bg-white/8 hover:text-white transition"
                >
                  <Icon size={16} className="text-[#d5a7ff]" />
                  {label.toUpperCase()}
                </Link>
              ))}
              <div className="pt-4 mt-4 border-t border-white/10">
                <button
                  onClick={() => { onClose(); void signOut({ callbackUrl: "/login" }); }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 font-mono text-xs text-red-300 hover:bg-red-500/10 transition"
                >
                  <LogOut size={16} />
                  SIGN OUT
                </button>
              </div>
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
}

// ── AppShell ──────────────────────────────────────────────

export function AppShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const path = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const isHome = path === "/";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#080709] pb-24 text-[#f4eef8]">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0a0d]/90 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          {/* Left: Back button + Logo */}
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

            {/* Desktop inner nav (authenticated only) */}
            {session?.user && (
              <nav className="hidden lg:flex items-center gap-4 ml-4">
                {[
                  { href: "/arena", label: "Arena" },
                  { href: "/solo", label: "Solo" },
                  { href: "/leaderboard", label: "Ranks" },
                ].map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`font-mono text-xs tracking-wider transition ${
                      path.startsWith(href) ? "text-[#d5a7ff]" : "text-[#8e8892] hover:text-[#d5a7ff]"
                    }`}
                  >
                    {label.toUpperCase()}
                  </Link>
                ))}
              </nav>
            )}
          </div>

          {/* Right: Authenticated or anonymous controls */}
          <div className="flex items-center gap-3">
            {session?.user ? (
              <>
                {/* Wallet connect status */}
                <div className="hidden sm:block">
                  <ConnectButton />
                </div>

                {/* Notification bell (placeholder) */}
                <button
                  className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[#a79cae] hover:text-white hover:border-white/20 transition"
                  title="Notifications"
                >
                  <Bell size={15} />
                </button>

                {/* User dropdown */}
                <UserDropdown />

                {/* Mobile hamburger */}
                <button
                  className="flex lg:hidden h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[#a79cae] hover:text-white transition"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Open menu"
                >
                  <Menu size={16} />
                </button>
              </>
            ) : (
              /* Anonymous header */
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="rounded-full border border-white/20 px-4 py-2 font-mono text-xs font-bold text-white hover:bg-white/10 transition"
                >
                  LOGIN
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-gradient-to-r from-[#d5a7ff] to-[#a855f7] px-4 py-2 font-mono text-xs font-bold text-black shadow-lg shadow-[#d5a7ff]/20 hover:scale-[1.03] transition"
                >
                  SIGN UP
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Page title */}
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

      {/* Provably fair footer bar */}
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

      {/* Bottom nav — authenticated users only */}
      {session?.user && (
        <nav className="fixed bottom-0 z-30 flex w-full justify-around border border-white/15 bg-[#0c0b0e]/95 px-3 py-3 backdrop-blur-xl">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <motion.div key={href} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Link
                href={href}
                className={`flex min-w-12 flex-col items-center gap-1 font-mono text-[10px] tracking-[.08em] transition ${
                  path === href || (href !== "/" && path.startsWith(href))
                    ? "text-[#d5a7ff]"
                    : "text-[#8e8892] hover:text-[#d5a7ff]"
                }`}
              >
                <Icon size={20} />
                {label.toUpperCase()}
              </Link>
            </motion.div>
          ))}
        </nav>
      )}
    </main>
  );
}

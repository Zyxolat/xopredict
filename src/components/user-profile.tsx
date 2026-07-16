"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useWalletPersistence } from "@/lib/hooks/useWalletPersistence";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface UserData {
  name: string;
  email: string;
  walletAddress: string | null;
  avatarColor: string;
  initials: string;
}

const AVATAR_COLORS = [
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-cyan-500",
];

function getAvatarColor(seed: string): string {
  const hash = seed
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function UserProfile() {
  const router = useRouter();
  const { data: session } = useSession();
  const { address: walletAddress } = useWalletPersistence();
  const [user, setUser] = useState<UserData | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (session?.user) {
      const displayName = session.user.name || "User";
      const avatarColor = getAvatarColor(displayName);
      const initials = displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      setUser({
        name: displayName,
        email: session.user.email || "",
        walletAddress: walletAddress || null,
        avatarColor,
        initials,
      });
    }
  }, [session, walletAddress]);

  const handleLogout = async () => {
    localStorage.removeItem("walletAddress");
    localStorage.removeItem("walletConnectedTime");
    await signOut({ redirect: true, callbackUrl: "/login" });
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-slate-800/50 px-3 py-2 hover:bg-slate-800 transition"
      >
        <div
          className={`w-8 h-8 ${user.avatarColor} rounded-full flex items-center justify-center text-white font-bold text-sm`}
        >
          {user.initials}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-xs font-semibold text-white">{user.name}</p>
          <p className="text-xs text-slate-400">
            {user.walletAddress
              ? user.walletAddress.slice(0, 6) +
                "..." +
                user.walletAddress.slice(-4)
              : user.email.slice(0, 20)}
          </p>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-cyan-500/30 rounded-lg shadow-lg z-50">
          <Link
            href="/profile"
            className="block w-full text-left px-4 py-2 hover:bg-slate-800 text-sm text-white"
            onClick={() => setIsOpen(false)}
          >
            View Profile
          </Link>
          <button
            onClick={() => {
              router.push("/settings");
              setIsOpen(false);
            }}
            className="w-full text-left px-4 py-2 hover:bg-slate-800 text-sm text-white"
          >
            Settings
          </button>
          <div className="border-t border-cyan-500/10 my-2" />
          <button
            onClick={() => {
              setIsOpen(false);
              handleLogout();
            }}
            className="w-full text-left px-4 py-2 hover:bg-slate-800 text-sm text-red-400 rounded-b-lg"
          >
            Logout
          </button>
        </div>
      )}

      {/* Close menu on outside click */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

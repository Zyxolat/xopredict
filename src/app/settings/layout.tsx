"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { User, Shield, Wallet, Bell, Lock } from "lucide-react";

const SETTINGS_TABS = [
  { href: "/settings/account", label: "Account", icon: User },
  { href: "/settings/security", label: "Security", icon: Shield },
  { href: "/settings/wallets", label: "Wallets", icon: Wallet },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/privacy", label: "Privacy", icon: Lock },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <AppShell title="Account Settings">
      <section className="mx-auto max-w-5xl px-5 pt-6 pb-20">
        <h1 className="text-3xl font-black text-white">SETTINGS</h1>
        <p className="mt-1 text-xs text-[#a79cae]">
          Manage your account identity, security credentials, and linked wallets
        </p>

        {/* Tab Bar */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-white/10 pb-4 font-mono text-xs">
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 rounded-2xl px-5 py-3 font-bold transition ${
                  isActive
                    ? "bg-[#d5a7ff] text-black shadow-md"
                    : "border border-white/10 bg-white/[0.03] text-[#d8cadd] hover:bg-white/[0.08]"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-8">{children}</div>
      </section>
    </AppShell>
  );
}

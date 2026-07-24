"use client";

import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { celo } from "wagmi/chains";
import { motion } from "framer-motion";

/** Celo mainnet chain ID — the only network Xolat operates on. */
const CELO_CHAIN_ID = celo.id; // 42220

interface NetworkGuardProps {
  children: React.ReactNode;
}

/**
 * Renders children transparently when:
 *  - No wallet is connected (wallet-connection gating is downstream)
 *  - The connected wallet is already on Celo (42220)
 *
 * Otherwise renders a styled banner with a one-click "Switch to Celo" button
 * powered by wagmi's useSwitchChain.  Children are NOT rendered while on the
 * wrong chain so downstream hooks (approval, reads) never target a wrong network.
 */
export function NetworkGuard({ children }: NetworkGuardProps) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  // Pass through when not yet connected or already on Celo
  if (!isConnected || chainId === CELO_CHAIN_ID) {
    return <>{children}</>;
  }

  return (
    <motion.div
      className="rounded-2xl border border-amber-400/30 bg-amber-400/[.07] p-6 text-center"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <p className="font-mono text-xs tracking-[.18em] text-amber-300">
        ⚠ WRONG NETWORK
      </p>
      <p className="mt-2 text-sm text-amber-200/80">
        XOLAT runs on Celo. Switch your wallet to continue.
      </p>
      <motion.button
        id="switch-to-celo-btn"
        onClick={() => switchChain({ chainId: CELO_CHAIN_ID })}
        disabled={isSwitching}
        className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-8 py-3 font-mono text-xs tracking-[.18em] text-amber-300 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
      >
        {isSwitching ? "SWITCHING…" : "SWITCH TO CELO"}
      </motion.button>
    </motion.div>
  );
}

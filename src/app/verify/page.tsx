"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app-shell";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface VerificationData {
  roundId: string;
  type: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  vrfRandom: string;
  computedNumbers: number[];
  storedNumbers: number[];
  isValid: boolean;
  winnerAddress: string | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

function VerifyContent() {
  const searchParams = useSearchParams();
  const initialRoundParam = searchParams.get("round") || searchParams.get("roundId") || "";

  const [inputRoundId, setInputRoundId] = useState(initialRoundParam);
  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVerification = async (targetId: string) => {
    if (!targetId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/verify?roundId=${encodeURIComponent(targetId)}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Verification error");
      }
      setData(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to verify round");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialRoundParam) {
      void fetchVerification(initialRoundParam);
    }
  }, [initialRoundParam]);

  return (
    <motion.section
      className="mx-auto max-w-2xl px-5 pt-4 pb-20 space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.p className="text-sm text-[#dad0df]" variants={itemVariants}>
        Independently validate the cryptographic seed commitment and Witnet VRF randomness for any round.
      </motion.p>

      {/* Input box */}
      <motion.div className="flex gap-2" variants={itemVariants}>
        <input
          type="text"
          placeholder="Enter Round UUID or ID..."
          value={inputRoundId}
          onChange={(e) => setInputRoundId(e.target.value)}
          className="flex-1 rounded-2xl border border-white/15 bg-black/50 px-4 py-3 font-mono text-sm text-white focus:border-[#d5a7ff] focus:outline-none"
        />
        <button
          onClick={() => fetchVerification(inputRoundId)}
          disabled={loading || !inputRoundId.trim()}
          className="rounded-2xl bg-[#d5a7ff] px-6 py-3 font-bold text-black hover:scale-105 transition disabled:opacity-40"
        >
          {loading ? "VERIFYING..." : "VERIFY"}
        </button>
      </motion.div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-mono text-red-300">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {data && (
        <motion.div
          className="space-y-4 rounded-3xl border border-white/15 bg-gradient-to-br from-[#1c1429] to-black p-6 font-mono text-xs shadow-2xl"
          variants={containerVariants}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <span className="font-bold text-white">ROUND #{data.roundId.slice(0, 8)}...</span>
            <span
              className={`flex items-center gap-1.5 font-bold rounded-full px-3 py-1 ${
                data.isValid
                  ? "border border-[#4ce47d]/40 bg-[#4ce47d]/10 text-[#4ce47d]"
                  : "border border-red-400/40 bg-red-400/10 text-red-400"
              }`}
            >
              <CheckCircle2 size={14} /> {data.isValid ? "PROVABLY FAIR & VALID" : "INVALID"}
            </span>
          </div>

          <motion.p variants={itemVariants}>
            <span className="text-[#d5a7ff]">GAME TYPE</span>
            <br />
            <span className="text-white uppercase">{data.type}</span>
          </motion.p>

          <motion.p variants={itemVariants}>
            <span className="text-[#d5a7ff]">SERVER SEED</span>
            <br />
            <span className="break-all text-white">{data.serverSeed}</span>
          </motion.p>

          <motion.p variants={itemVariants}>
            <span className="text-[#d5a7ff]">CLIENT SEED / NONCE</span>
            <br />
            <span className="break-all text-white">{data.clientSeed} / Nonce: {data.nonce}</span>
          </motion.p>

          <motion.p variants={itemVariants}>
            <span className="text-[#d5a7ff]">WITNET VRF RANDOM</span>
            <br />
            <span className="break-all text-white">{data.vrfRandom || "Recorded On-Chain"}</span>
          </motion.p>

          <motion.p variants={itemVariants}>
            <span className="text-[#d5a7ff]">COMPUTED NUMBERS</span>
            <br />
            <span className="text-[#4ce47d] font-bold">[{data.computedNumbers.join(", ")}]</span>
          </motion.p>

          {data.winnerAddress && (
            <motion.p variants={itemVariants}>
              <span className="text-[#d5a7ff]">VERIFIED WINNER</span>
              <br />
              <span className="text-yellow-400 font-bold">{data.winnerAddress}</span>
            </motion.p>
          )}
        </motion.div>
      )}
    </motion.section>
  );
}

export default function VerifyPage() {
  return (
    <AppShell title="Verify Fairness">
      <Suspense fallback={<div className="p-8 text-center text-xs font-mono text-[#8e8892]">Loading verifier...</div>}>
        <VerifyContent />
      </Suspense>
    </AppShell>
  );
}

"use client";

import { AppShell } from "@/components/app-shell";
import { useState } from "react";

interface VerifyData {
  roundId: string;
  type: string;
  serverSeed?: string;
  clientSeed?: string;
  nonce?: number;
  vrfRandom?: string;
  computedNumbers: number[];
  storedNumbers: number[];
  isValid: boolean;
  winnerAddress?: string;
  picks: Array<{ playerAddress: string; cardIndex: number; value?: number }>;
}

export default function VerifyPage() {
  const [roundId, setRoundId] = useState("842");
  const [verifyData, setVerifyData] = useState<VerifyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/verify?roundId=${roundId}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Verification failed");
      } else {
        setVerifyData(json.data);
      }
    } catch {
      setError("Error verifying round");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Verify Fairness">
      <section className="mx-auto max-w-2xl px-5 pt-7">
        <p className="text-[#d8cadd]">Independently validate the immutable commitment for round #{roundId}. No backend RNG is used.</p>
        
        <div className="mt-6 space-y-3">
          <input
            type="text"
            placeholder="Enter Round ID"
            value={roundId}
            onChange={(e) => setRoundId(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-white placeholder:text-white/50"
          />
          <button
            onClick={handleVerify}
            disabled={loading}
            className="w-full rounded-2xl bg-[#4ce47d] py-4 font-black text-black disabled:opacity-50"
          >
            {loading ? "VERIFYING..." : "RECOMPUTE NUMBERS"}
          </button>
        </div>

        {error && <p className="mt-4 text-red-400">{error}</p>}

        {verifyData && (
          <div className="mt-6 space-y-4 rounded-2xl border border-white/15 bg-white/[.025] p-5 font-mono text-xs">
            <p>
              <span className="text-[#d5a7ff]">COMMIT HASH</span>
              <br />
              {verifyData.roundId?.substring(0, 16)}...
            </p>
            <p>
              <span className="text-[#d5a7ff]">SERVER SEED</span>
              <br />
              {verifyData.serverSeed || "Not revealed"}
            </p>
            <p>
              <span className="text-[#d5a7ff]">CLIENT SEED / NONCE</span>
              <br />
              {verifyData.clientSeed || "N/A"} / {verifyData.nonce ?? "N/A"}
            </p>
            <p>
              <span className="text-[#d5a7ff]">VRF RANDOM</span>
              <br />
              {verifyData.vrfRandom || "N/A"}
            </p>
            <p>
              <span className={verifyData.isValid ? "text-green-400" : "text-red-400"}>
                VERIFICATION: {verifyData.isValid ? "✓ VALID" : "✗ INVALID"}
              </span>
            </p>
            <p>
              <span className="text-[#d5a7ff]">COMPUTED NUMBERS</span>
              <br />
              {JSON.stringify(verifyData.computedNumbers)}
            </p>
          </div>
        )}
      </section>
    </AppShell>
  );
}

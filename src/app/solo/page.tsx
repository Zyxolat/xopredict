"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { BetInput } from "@/components/bet-input";
import { Card3D } from "@/components/card-3d";

export default function SoloPage() {
  const [bet, setBet] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const play = () => { if (picked !== null && Number(bet) > 0) setRevealed(true); };
  return <AppShell title="Solo Prediction"><section className="mx-auto max-w-2xl px-5 pt-8"><div className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/[.08] to-white/[.02] p-7"><p className="font-mono text-xs tracking-[.18em] text-[#bfb3c6]">CURRENT BALANCE</p><p className="mt-3 text-3xl font-bold text-[#d5a7ff]">2,450.00 USDm</p></div><div className="mt-9"><BetInput value={bet} onChange={setBet} /><div className="mt-5 flex justify-between font-mono text-sm tracking-[.12em]"><span>MULTIPLIER</span><span className="text-3xl font-black text-[#4ce47d]">1.95x</span></div></div><div className="mt-20 grid grid-cols-2 gap-4">{["LEFT PATH", "RIGHT PATH"].map((label, index) => <Card3D key={label} label={label} selected={picked === index} revealed={revealed} value={index === 1 ? 100 : 42} onClick={() => !revealed && setPicked(index)} />)}</div><button onClick={play} disabled={picked === null || !bet || revealed} className="mt-8 w-full rounded-2xl bg-[#4ce47d] py-4 text-xl font-black text-black disabled:cursor-not-allowed disabled:opacity-40">{revealed ? "ROUND REVEALED" : "LOCK IN PREDICTION"}</button></section></AppShell>;
}

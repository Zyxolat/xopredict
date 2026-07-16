"use client";

export function BetInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="block rounded-2xl border border-white/20 bg-white/[.025] p-3"><span className="font-mono text-xs tracking-[.15em] text-[#d8cadd]">SET YOUR BET</span><div className="mt-3 flex gap-3"><div className="flex flex-1 items-center rounded-xl bg-white/[.08] px-4"><span className="font-mono text-lg text-[#d5a7ff]">USDm</span><input aria-label="Bet amount in USDm" inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} className="w-full bg-transparent px-3 py-4 text-right text-2xl font-bold outline-none" placeholder="0.00" /></div><button type="button" onClick={() => onChange("20")} className="rounded-xl bg-white/[.12] px-5 font-mono text-lg text-[#d5a7ff]">MAX</button></div></label>;
}

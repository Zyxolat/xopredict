"use client";

import { motion } from "framer-motion";
import { LockKeyhole, Star } from "lucide-react";

export function Card3D({ label, selected, revealed, value, onClick }: { label: string; selected?: boolean; revealed?: boolean; value?: number; onClick?: () => void }) {
  return <motion.button onClick={onClick} whileHover={{ rotateY: 10, scale: 1.02 }} whileTap={{ scale: .97 }} className={`relative flex min-h-56 w-full flex-col items-center justify-center rounded-2xl border bg-gradient-to-br from-white/[.07] to-white/[.015] p-5 transition ${selected ? "border-[#4ce47d] shadow-[0_0_28px_rgba(76,228,125,.18)]" : "border-[#a77cca]/45"}`}>
    {revealed ? <><span className="text-5xl font-black text-[#4ce47d]">{value}</span><span className="mt-4 font-mono text-xs tracking-[.18em]">REVEALED</span></> : <><div className={`grid h-20 w-20 place-items-center rounded-xl border-2 ${selected ? "border-[#4ce47d] bg-[#4ce47d]/10" : "border-[#765d89] bg-[#d5a7ff]/10"}`}>{selected ? <Star className="text-[#4ce47d]" size={42} /> : <LockKeyhole className="text-[#d5a7ff]" size={38} />}</div><span className="mt-7 font-mono text-sm tracking-[.18em]">{label}</span></>}
  </motion.button>;
}

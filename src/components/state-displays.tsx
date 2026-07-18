"use client";

import { motion } from "framer-motion";

export function LoadingState() {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="h-12 w-12 rounded-full border-4 border-[#d5a7ff]/20 border-t-[#d5a7ff]"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <p className="mt-4 font-mono text-sm tracking-[.12em] text-[#d8cadd]">
        LOADING...
      </p>
    </motion.div>
  );
}

export function ErrorState({ message = "An error occurred" }: { message?: string }) {
  return (
    <motion.div
      className="rounded-2xl border border-red-400/30 bg-red-400/10 p-6 text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <p className="font-mono text-sm tracking-[.12em] text-red-300">ERROR</p>
      <p className="mt-2 text-sm text-red-200">{message}</p>
    </motion.div>
  );
}

export function EmptyState({ message = "No data available" }: { message?: string }) {
  return (
    <motion.div
      className="rounded-2xl border border-white/10 bg-white/[.02] p-12 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="text-4xl text-[#d5a7ff]">◯</div>
      <p className="mt-4 font-mono text-sm tracking-[.12em] text-[#d8cadd]">
        {message}
      </p>
    </motion.div>
  );
}

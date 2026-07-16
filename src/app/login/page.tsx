"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ConnectButton } from "@/components/connect-button";
import { XolatLogo } from "@/components/xolat-logo";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: "easeOut" },
  },
};

const logoVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 1, ease: "easeOut" },
  },
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const glowVariants = {
  animate: {
    boxShadow: [
      "0 0 20px rgba(213, 167, 255, 0.3)",
      "0 0 40px rgba(213, 167, 255, 0.5)",
      "0 0 20px rgba(213, 167, 255, 0.3)",
    ],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

export default function LoginPage() {
  const { isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080709] text-[#f4eef8]">
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-[#d5a7ff]/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-[#8d739c]/10 blur-3xl" />
      </div>

      {/* Content */}
      <motion.div
        className="relative flex min-h-screen flex-col items-center justify-center px-5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo Section */}
        <motion.div
          className="mb-12 flex flex-col items-center"
          variants={itemVariants}
        >
          <motion.div
            className="mb-8 flex items-center justify-center"
            variants={logoVariants}
            initial="hidden"
            animate={["visible", "animate"]}
          >
            <motion.div variants={glowVariants} animate="animate">
              <XolatLogo className="w-80 h-56" />
            </motion.div>
          </motion.div>

          <motion.h1
            className="text-center text-4xl font-black tracking-tighter md:text-5xl"
            variants={itemVariants}
            style={{
              background: "linear-gradient(135deg, #d5a7ff 0%, #8d739c 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            XOLAT
          </motion.h1>

          <motion.p
            className="mt-3 max-w-md text-center text-sm tracking-wide text-[#b8a4c4]"
            variants={itemVariants}
          >
            The next-generation USDm prediction arena on Celo. Play, predict, and earn.
          </motion.p>
        </motion.div>

        {/* Features */}
        <motion.div
          className="mb-12 grid max-w-2xl gap-4 sm:grid-cols-3"
          variants={containerVariants}
        >
          {[
            { title: "PREDICT", desc: "Forecast USDm movements" },
            { title: "COMPETE", desc: "Challenge other players" },
            { title: "EARN", desc: "Win real rewards" },
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              className="rounded-lg border border-[#8d739c]/40 bg-[#0b0a0d]/50 px-4 py-6 text-center backdrop-blur"
              variants={itemVariants}
              whileHover={{ borderColor: "#d5a7ff" }}
            >
              <h3 className="font-bold tracking-widest text-[#d5a7ff]">
                {feature.title}
              </h3>
              <p className="mt-2 text-xs text-[#b8a4c4]">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Connect Button */}
        <motion.div className="mb-8 flex flex-col items-center gap-6" variants={itemVariants}>
          <div className="w-full sm:w-auto">
            <ConnectButton />
          </div>
          <p className="text-xs text-[#8d739c]">
            Connect your wallet to get started
          </p>
        </motion.div>

        {/* Footer Links */}
        <motion.div
          className="mt-12 flex flex-wrap justify-center gap-6 text-xs text-[#8d739c]"
          variants={itemVariants}
        >
          <Link href="#" className="hover:text-[#d5a7ff] transition">
            Terms of Service
          </Link>
          <span>•</span>
          <Link href="#" className="hover:text-[#d5a7ff] transition">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="#" className="hover:text-[#d5a7ff] transition">
            Contact
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}

import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { celo } from "wagmi/chains";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "c4f79cc821944d9680842e34466bfb00";

if (!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
  console.warn("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is missing in env, using fallback ID.");
}

const wagmiAdapter = new WagmiAdapter({
  networks: [celo],
  projectId,
  ssr: true,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks: [celo],
  projectId,
  metadata: {
    name: "XOLAT",
    description: "USDm prediction arena on Celo",
    url: "https://xopredict.com",
    icons: [],
  },
  themeMode: "dark",
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

import { cookieStorage, createConfig, createStorage, http } from "wagmi";
import { celo } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

export const wagmiConfig = createConfig({
  chains: [celo],
  connectors: [
    injected(),
    ...(projectId ? [walletConnect({ projectId, showQrModal: true })] : []),
  ],
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
  transports: { [celo.id]: http(process.env.NEXT_PUBLIC_CELO_RPC_URL) },
});

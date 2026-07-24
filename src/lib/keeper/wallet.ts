import { createPublicClient, createWalletClient, http, fallback, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";

const RPC_URL = process.env.NEXT_PUBLIC_CELO_RPC_URL || "https://forno.celo.org";
const RELAYER_KEY = process.env.RELAYER_PRIVATE_KEY;
export const MIN_CELO_THRESHOLD = 1.0; // 1.0 CELO minimum balance threshold

export const publicClient = createPublicClient({
  chain: celo,
  transport: fallback([http(RPC_URL), http("https://rpc.ankr.com/celo")]),
});

export function getRelayerAccount() {
  if (!RELAYER_KEY || !RELAYER_KEY.startsWith("0x")) {
    return null;
  }
  try {
    return privateKeyToAccount(RELAYER_KEY as `0x${string}`);
  } catch (error) {
    console.error("[Keeper Wallet] Invalid RELAYER_PRIVATE_KEY:", error);
    return null;
  }
}

export function getRelayerWalletClient() {
  const account = getRelayerAccount();
  if (!account) return null;

  return createWalletClient({
    account,
    chain: celo,
    transport: fallback([http(RPC_URL), http("https://rpc.ankr.com/celo")]),
  });
}

/**
 * Check relayer wallet native CELO balance and log warning if below threshold.
 */
export async function checkRelayerBalance() {
  const account = getRelayerAccount();
  if (!account) {
    return { balanceCelo: 0, isLow: true, configured: false };
  }

  try {
    const rawBalance = await publicClient.getBalance({ address: account.address });
    const balanceCelo = parseFloat(formatEther(rawBalance));
    const isLow = balanceCelo < MIN_CELO_THRESHOLD;

    if (isLow) {
      console.warn(
        `[Keeper Wallet Warning] Relayer native CELO balance is low: ${balanceCelo.toFixed(4)} CELO (Threshold: ${MIN_CELO_THRESHOLD} CELO). Refill relayer address: ${account.address}`
      );
    }

    return { balanceCelo, isLow, configured: true };
  } catch (err) {
    console.error("[Keeper Wallet] Error querying relayer balance:", err);
    return { balanceCelo: 0, isLow: true, configured: true };
  }
}

/**
 * Retrieve comprehensive health metrics for the relayer service.
 */
export async function getRelayerHealth() {
  const account = getRelayerAccount();
  if (!account) {
    return {
      configured: false,
      address: null,
      balanceCelo: null,
      isBalanceLow: true,
      message: "Relayer private key not configured (RELAYER_PRIVATE_KEY missing)",
    };
  }

  const { balanceCelo, isLow } = await checkRelayerBalance();

  return {
    configured: true,
    address: account.address,
    balanceCelo: balanceCelo.toFixed(4),
    isBalanceLow: isLow,
    message: isLow
      ? `Relayer balance low (${balanceCelo.toFixed(4)} CELO < ${MIN_CELO_THRESHOLD} CELO threshold)`
      : `Relayer wallet healthy (${balanceCelo.toFixed(4)} CELO available)`,
  };
}

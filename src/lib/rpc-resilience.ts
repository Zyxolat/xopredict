import { createPublicClient, http, fallback } from "viem";
import { celo } from "viem/chains";

export type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface RPCProviderStatus {
  url: string;
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  lastFailureAt: number | null;
  score: number; // 0 to 100
}

const DEFAULT_RPC_ENDPOINTS = [
  process.env.NEXT_PUBLIC_CELO_RPC_URL || "https://forno.celo.org",
  "https://rpc.ankr.com/celo",
  "https://1rpc.io/celo",
];

const MAX_FAILURES_BEFORE_OPEN = 3;
const RESET_TIMEOUT_MS = 60_000; // 60 seconds cooling period before HALF_OPEN test

class RPCResilienceEngine {
  private providers: Map<string, RPCProviderStatus> = new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public client: any;

  constructor(urls: string[] = DEFAULT_RPC_ENDPOINTS) {
    const uniqueUrls = Array.from(new Set(urls.filter((u) => u && u.startsWith("http"))));

    for (const url of uniqueUrls) {
      this.providers.set(url, {
        url,
        state: "CLOSED",
        failures: 0,
        successes: 0,
        lastFailureAt: null,
        score: 100,
      });
    }

    // Build resilient Viem public client using fallback transport
    const transports = uniqueUrls.map((url) => http(url, { timeout: 10_000, retryCount: 2 }));
    this.client = createPublicClient({
      chain: celo,
      transport: fallback(transports, { rank: true }),
    });
  }

  public recordSuccess(url: string) {
    const provider = this.providers.get(url);
    if (!provider) return;

    provider.successes += 1;
    if (provider.state === "HALF_OPEN") {
      provider.state = "CLOSED";
      provider.failures = 0;
      provider.score = 100;
    } else {
      provider.score = Math.min(100, provider.score + 5);
    }
  }

  public recordFailure(url: string, error: unknown) {
    const provider = this.providers.get(url);
    if (!provider) return;

    provider.failures += 1;
    provider.lastFailureAt = Date.now();
    provider.score = Math.max(0, provider.score - 25);

    if (provider.failures >= MAX_FAILURES_BEFORE_OPEN) {
      provider.state = "OPEN";
      console.warn(
        `[RPC Resilience Circuit Breaker] Provider ${url} tripped OPEN after ${provider.failures} failures. Error:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  public getHealthyEndpoints(): string[] {
    const now = Date.now();
    const healthy: string[] = [];

    for (const [url, provider] of this.providers.entries()) {
      if (provider.state === "OPEN") {
        if (provider.lastFailureAt && now - provider.lastFailureAt > RESET_TIMEOUT_MS) {
          provider.state = "HALF_OPEN";
          healthy.push(url);
        }
      } else {
        healthy.push(url);
      }
    }

    return healthy.length > 0 ? healthy : Array.from(this.providers.keys());
  }

  public getProviderStatus(): RPCProviderStatus[] {
    const now = Date.now();
    const result: RPCProviderStatus[] = [];

    for (const provider of this.providers.values()) {
      if (provider.state === "OPEN" && provider.lastFailureAt && now - provider.lastFailureAt > RESET_TIMEOUT_MS) {
        provider.state = "HALF_OPEN";
      }
      result.push({ ...provider });
    }

    return result;
  }
}

export const rpcResilience = new RPCResilienceEngine();

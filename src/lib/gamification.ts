/**
 * Gamification utilities: ranks, XP, daily free play, streaks
 */
import crypto from "crypto";

export type Rank = "Bronze" | "Silver" | "Gold" | "Diamond";

interface RankThreshold {
  min: number;
  rank: Rank;
}

const RANK_THRESHOLDS: RankThreshold[] = [
  { min: 0, rank: "Bronze" },
  { min: 100, rank: "Silver" },
  { min: 500, rank: "Gold" },
  { min: 2000, rank: "Diamond" },
];

const COSMETIC_PRICES: Record<string, number> = {
  card_back_gold: 5,
  card_back_neon: 5,
  flip_fx_holographic: 10,
  flip_fx_matrix: 10,
  frame_diamond: 15,
  frame_cosmic: 15,
};

export function calculateRank(totalWonUsdm: number): Rank {
  const usdmAmount = Number(totalWonUsdm) || 0;
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (usdmAmount >= RANK_THRESHOLDS[i].min) {
      return RANK_THRESHOLDS[i].rank;
    }
  }
  return "Bronze";
}

export function calculateXP(
  betAmount: number,
  won: boolean
): number {
  // 1 XP per 0.1 USDm bet + 5 XP if won
  const betXp = Math.floor(betAmount / 0.1);
  const winXp = won ? 5 : 0;
  return betXp + winXp;
}

export function calculateDailyMultiplier(streakDays: number): number {
  // 1.1x per day, capped at 2x (max 11 day streak)
  return Math.min(1 + streakDays * 0.1, 2);
}

export function calculateFreePlayAmount(multiplier: number): number {
  // Base 0.1 USDm * multiplier
  return Number((0.1 * multiplier).toFixed(18));
}

/**
 * Check if player is eligible for free play
 */
export function isEligibleForFreePlay(
  lastFreePlay: Date | null,
  currentTime: Date = new Date()
): boolean {
  if (!lastFreePlay) return true;
  const hoursSince = (currentTime.getTime() - lastFreePlay.getTime()) / (1000 * 60 * 60);
  return hoursSince >= 24;
}

/**
 * Verify seed reveal: reconstruct game state from seeds
 */
export function verifySeedReveal(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): number[] {
  // Keccak256-like hash (using SHA256 for demo, replace with actual Keccak)
  const combined = `${serverSeed}${clientSeed}${nonce}`;
  const hash = crypto.createHash("sha256").update(combined).digest("hex");

  // Convert hash to card numbers (0-3 for 4 cards, repeated)
  const numbers = [];
  for (let i = 0; i < 8; i++) {
    const byte = parseInt(hash.substring(i * 2, i * 2 + 2), 16);
    numbers.push(byte % 4);
  }
  return numbers;
}

/**
 * Generate commit hash from seeds (for provably fair)
 */
export function generateCommitHash(serverSeed: string, clientSeed: string): string {
  const combined = `${serverSeed}${clientSeed}`;
  return crypto.createHash("sha256").update(combined).digest("hex");
}

/**
 * Get cosmetic price
 */
export function getCosmeticPrice(type: string, name: string): number {
  const key = `${type}_${name}`;
  return COSMETIC_PRICES[key] || 5; // Default 5 USDm
}

/**
 * Validate cosmetic purchase
 */
export function validateCosmeticPurchase(
  type: string,
  name: string,
  playerBalance: number
): { valid: boolean; reason?: string } {
  const price = getCosmeticPrice(type, name);
  if (playerBalance < price) {
    return { valid: false, reason: "Insufficient balance" };
  }
  if (!["card_back", "flip_fx", "frame"].includes(type)) {
    return { valid: false, reason: "Invalid cosmetic type" };
  }
  return { valid: true };
}

/**
 * Cooldown check: 5 losses = 1hr cooldown
 */
export function calculateCooldown(
  recentLosses: number,
  lastLossTime: Date | null
): { active: boolean; remainingMinutes?: number } {
  if (recentLosses < 5) {
    return { active: false };
  }
  if (!lastLossTime) {
    return { active: false };
  }
  const hoursSince = (new Date().getTime() - lastLossTime.getTime()) / (1000 * 60 * 60);
  if (hoursSince >= 1) {
    return { active: false };
  }
  const remainingMinutes = Math.ceil((1 - hoursSince) * 60);
  return { active: true, remainingMinutes };
}

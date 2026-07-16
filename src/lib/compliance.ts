/**
 * Compliance utilities: limits, cooldowns, IP blocking, KYC
 */

const BLOCKED_COUNTRIES = ["US"]; // Can expand

/**
 * Get country code from IP (mock - use MaxMind GeoIP2 in production)
 */
export async function getCountryFromIP(): Promise<string> {
  // In production, use Vercel's geo middleware or MaxMind API
  // For now, return empty (no blocking)
  return "";
}

/**
 * Check if IP is from blocked region
 */
export async function isIPBlocked(ip: string): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void ip;
  const country = await getCountryFromIP();
  return BLOCKED_COUNTRIES.includes(country);
}

/**
 * Validate daily bet limit
 */
export function validateDailyLimit(
  currentDailyTotal: number,
  newBetAmount: number,
  maxPerDay: number = 100
): { valid: boolean; reason?: string; remainingToday?: number } {
  if (currentDailyTotal + newBetAmount > maxPerDay) {
    const remaining = Math.max(0, maxPerDay - currentDailyTotal);
    return {
      valid: false,
      reason: `Daily limit exceeded. Remaining: ${remaining.toFixed(2)} USDm`,
      remainingToday: remaining,
    };
  }
  return { valid: true, remainingToday: maxPerDay - currentDailyTotal - newBetAmount };
}

/**
 * Validate per-bet limit
 */
export function validatePerBetLimit(
  betAmount: number,
  maxPerBet: number = 20
): { valid: boolean; reason?: string } {
  if (betAmount > maxPerBet) {
    return {
      valid: false,
      reason: `Max bet is ${maxPerBet} USDm`,
    };
  }
  if (betAmount < 0.01) {
    return {
      valid: false,
      reason: "Minimum bet is 0.01 USDm",
    };
  }
  return { valid: true };
}

/**
 * Get IP from request headers
 */
export function getIPFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (forwarded ? forwarded.split(";")[0] : request.headers.get("x-real-ip")) || "unknown";
}

/**
 * Validate user is 18+
 */
export function validateAgeRequired(): { show: boolean; timestamp: string } {
  // Check localStorage/session for TOS acceptance
  return { show: true, timestamp: new Date().toISOString() };
}

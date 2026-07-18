/**
 * Compliance utilities: limits, cooldowns, IP blocking, KYC
 */

const BLOCKED_COUNTRIES = ["US", "IN"]; // USA, India - can expand
const GEO_HEADER_KEYS = [
  "x-vercel-ip-country",      // Vercel
  "cf-ipcountry",              // Cloudflare
  "x-appengine-country",       // Google App Engine
  "x-forwarded-country",       // Custom header
];

/**
 * Get country code from request headers (using multiple geo sources)
 * Tries in order: Vercel, Cloudflare, App Engine, custom headers
 * 
 * In production, this should be used with Vercel's IP geolocation middleware
 * which automatically adds the x-vercel-ip-country header.
 * 
 * @param request The Next.js Request object
 * @returns Country code (e.g., "US", "GB") or empty string if unable to detect
 */
export function getCountryFromRequest(request: Request): string {
  // Try multiple geolocation header sources
  for (const headerKey of GEO_HEADER_KEYS) {
    const country = request.headers.get(headerKey);
    if (country && country.length === 2) {
      return country.toUpperCase();
    }
  }

  // Try to extract from X-Forwarded-For IP (fallback method)
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const ip = xForwardedFor.split(",")[0].trim();
    // Note: Actual IP geo lookup would require external service
    // This is just for logging/debugging
    console.warn(
      `[Compliance] Could not determine country from headers. IP: ${ip}`
    );
  }

  // Default: return empty if unable to detect
  // This means the player will be allowed to proceed (no blocking on unknown country)
  return "";
}

/**
 * Check if country is blocked
 * @param countryCode Two-letter ISO country code
 * @returns true if country is blocked, false otherwise
 */
export function isCountryBlocked(countryCode: string): boolean {
  if (!countryCode) return false; // Allow if unable to detect
  return BLOCKED_COUNTRIES.includes(countryCode.toUpperCase());
}

/**
 * Get display name for country code (for error messages)
 */
export function getCountryName(countryCode: string): string {
  const countryNames: Record<string, string> = {
    US: "United States",
    IN: "India",
    GB: "United Kingdom",
    CA: "Canada",
    AU: "Australia",
  };
  return countryNames[countryCode] || countryCode;
}

/**
 * Legacy function - deprecated
 * Use getCountryFromRequest instead for real request-based geo-detection
 * 
 * This previously tried to do IP-based geo-lookup but that requires
 * external services. Now we rely on CDN/infrastructure headers.
 */
export async function getCountryFromIP(): Promise<string> {
  // Deprecated - kept for backward compatibility
  // All geolocation should go through getCountryFromRequest with Vercel middleware
  return "";
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

/**
 * Referral system utilities
 */

export const REFERRAL_BONUS = 1; // 1 USDm for both referrer and referee

/**
 * Check if referral code is valid
 */
export function isValidReferralCode(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Generate referral URL
 */
export function generateReferralURL(baseURL: string, referrerAddress: string): string {
  return `${baseURL}?ref=${referrerAddress.toLowerCase()}`;
}

/**
 * Extract referrer from URL params
 */
export function extractReferrer(searchParams: URLSearchParams): string | null {
  const ref = searchParams.get("ref");
  return ref && isValidReferralCode(ref) ? ref.toLowerCase() : null;
}

/**
 * Award referral bonus to both parties
 */
export async function awardReferralBonus(
  referrerAddress: string,
  refereeAddress: string
): Promise<{ success: boolean; reason?: string }> {
  // This is called when referee makes first bet
  // Both get 1 USDm bonus
  // In production, transfer from treasury to referrerAddress and refereeAddress
  // TODO: Implement treasury transfer logic
  void referrerAddress;
  void refereeAddress;
  return { success: true };
}

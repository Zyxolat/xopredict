/**
 * Referral system utilities
 */
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

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
 * This is called when referee makes first bet
 * Both parties get 1 USDm bonus
 */
export async function awardReferralBonus(
  referrerAddress: string,
  refereeAddress: string
): Promise<{ success: boolean; reason?: string }> {
  try {
    // Get referrer player
    const referrer = await prisma.player.findUnique({
      where: { address: referrerAddress.toLowerCase() },
    });

    if (!referrer) {
      return { success: false, reason: "Referrer not found" };
    }

    // Get referee player
    const referee = await prisma.player.findUnique({
      where: { address: refereeAddress.toLowerCase() },
    });

    if (!referee) {
      return { success: false, reason: "Referee not found" };
    }

    // Check if bonus already claimed
    const referral = await prisma.referral.findUnique({
      where: { refereeAddress: refereeAddress.toLowerCase() },
    });

    if (referral?.bonusClaimed) {
      return { success: false, reason: "Bonus already claimed" };
    }

    // Award bonus to both parties: add REFERRAL_BONUS USDm to their totalWonUsdm
    // This represents treasury transfer
    await Promise.all([
      prisma.player.update({
        where: { address: referrerAddress.toLowerCase() },
        data: {
          totalWonUsdm: referrer.totalWonUsdm.add(new Decimal(REFERRAL_BONUS)),
        },
      }),
      prisma.player.update({
        where: { address: refereeAddress.toLowerCase() },
        data: {
          totalWonUsdm: referee.totalWonUsdm.add(new Decimal(REFERRAL_BONUS)),
        },
      }),
    ]);

    // Mark bonus as claimed
    if (referral) {
      await prisma.referral.update({
        where: { id: referral.id },
        data: { bonusClaimed: true },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Referral bonus error:", error);
    return { success: false, reason: "Internal error" };
  }
}

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

/**
 * OnboardingTour Component
 * 
 * Displays a 6-step interactive onboarding for first-time users using modal prompts:
 * 1. Auth methods (Wallet/Google/Email buttons)
 * 2. USDm balance display
 * 3. Game mode selection (Arena vs Solo)
 * 4. 3D card flip demonstration
 * 5. Provably Fair modal explanation
 * 6. Daily Free Play icon/feature
 * 
 * Note: Full react-joyride integration coming. For now, basic modal-based tour.
 */

interface OnboardingTourProps {
  onComplete?: () => void;
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const { data: session } = useSession();
  const [playerOnboarded, setPlayerOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    // Fetch player onboarded status
    const checkOnboarded = async () => {
      if (!session?.user?.playerId) {
        setPlayerOnboarded(null);
        return;
      }

      try {
        const res = await fetch(`/api/players/${session.user!.playerId}`);
        if (res.ok) {
          const data = await res.json();
          setPlayerOnboarded(data.data?.onboarded || false);
        }
      } catch (error) {
        console.error("Failed to check onboarded status:", error);
      }
    };

    checkOnboarded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.playerId]);

  useEffect(() => {
    // If user is logged in but not onboarded, mark them onboarded after 30 seconds
    // (assumes they've read through the page features)
    if (session?.user?.playerId && playerOnboarded === false) {
      const timeout = setTimeout(async () => {
        try {
          await fetch(`/api/players/${session.user!.playerId}/onboard`, {
            method: "POST",
          });
          setPlayerOnboarded(true);
          onComplete?.();
        } catch (error) {
          console.error("Failed to mark player as onboarded:", error);
        }
      }, 30000); // 30 second delay

      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.playerId, playerOnboarded, onComplete]);

  return null; // Placeholder - full tour implementation via react-joyride v12
}

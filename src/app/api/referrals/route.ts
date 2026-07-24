/**
 * POST /api/referrals - Create or claim referral
 * GET /api/referrals - Get referral info
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { playerIdSchema } from "@/lib/validation";
import { requireSelf, assertSelf, requireSession } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const { playerId, referrerId } = await req.json();

    // Validate IDs
    const playerParsed = playerIdSchema.safeParse(playerId);
    const referrerParsed = referrerId
      ? playerIdSchema.safeParse(referrerId)
      : { success: true, data: null };

    if (!playerParsed.success || (referrerId && !referrerParsed.success)) {
      return NextResponse.json({ error: "Invalid player ID format" }, { status: 400 });
    }

    const player = playerParsed.data;
    const referrer = referrerParsed.data;

    // Only the authenticated player may register their own referral.
    const fail = assertSelf(auth, player!);
    if (fail) return fail.response;

    // Check if player already has a referrer
    const existingReferral = await prisma.referral.findUnique({
      where: { refereeId: player },
    });

    if (existingReferral) {
      return NextResponse.json(
        { error: "Player already has a referrer" },
        { status: 409 }
      );
    }

    if (referrer) {
      // Verify referrer exists
      const referrerPlayer = await prisma.player.findUnique({
        where: { id: referrer },
      });

      if (!referrerPlayer) {
        return NextResponse.json({ error: "Referrer not found" }, { status: 404 });
      }

      // Create referral relationship
      const referral = await prisma.referral.create({
        data: {
          referrerId: referrer,
          refereeId: player,
          bonusClaimed: false,
        },
      });

      return NextResponse.json({
        data: {
          referralId: referral.id,
          referrerId: referrer,
          bonusClaimed: false,
        },
      });
    }

    return NextResponse.json(
      { error: "Referrer address required" },
      { status: 400 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const playerId = req.nextUrl.searchParams.get("playerId");
    if (!playerId) {
      return NextResponse.json({ error: "Player ID required" }, { status: 400 });
    }

    const parsed = playerIdSchema.safeParse(playerId);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });
    }

    const auth = await requireSelf(parsed.data);
    if (!auth.ok) return auth.response;

    const pId = parsed.data;

    // Get referral info as referee
    const asReferre = await prisma.referral.findUnique({
      where: { refereeId: pId },
      include: { referrer: { select: { username: true } } },
    });

    // Get referrals made as referrer
    const asReferrer = await prisma.referral.findMany({
      where: { referrerId: pId },
      include: { referee: { select: { username: true } } },
    });

    return NextResponse.json({
      data: {
        referrer: asReferre
          ? {
              playerId: asReferre.referrerId,
              username: asReferre.referrer.username,
              bonusClaimed: asReferre.bonusClaimed,
            }
          : null,
        referrals: asReferrer.map((r: typeof asReferrer[number]) => ({
          playerId: r.refereeId,
          username: r.referee.username,
          bonusClaimed: r.bonusClaimed,
        })),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

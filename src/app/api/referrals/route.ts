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

    const playerParsed = playerIdSchema.safeParse(playerId);
    const referrerParsed = referrerId
      ? playerIdSchema.safeParse(referrerId)
      : { success: true, data: null };

    if (!playerParsed.success || (referrerId && !referrerParsed.success)) {
      return NextResponse.json({ error: "Invalid player ID format" }, { status: 400 });
    }

    const player = playerParsed.data;
    const referrer = referrerParsed.data;

    const fail = assertSelf(auth, player!);
    if (fail) return fail.response;

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
      const referrerPlayer = await prisma.player.findUnique({
        where: { id: referrer },
      });

      if (!referrerPlayer) {
        return NextResponse.json({ error: "Referrer not found" }, { status: 404 });
      }

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

    const asReferre = await prisma.referral.findUnique({
      where: { refereeId: pId },
      include: {
        referrer: {
          include: {
            user: { select: { username: true, displayName: true } },
          },
        },
      },
    });

    const asReferrer = await prisma.referral.findMany({
      where: { referrerId: pId },
      include: {
        referee: {
          include: {
            user: { select: { username: true, displayName: true } },
          },
        },
      },
    });

    return NextResponse.json({
      data: {
        referrer: asReferre
          ? {
              playerId: asReferre.referrerId,
              username: asReferre.referrer.user?.username || "Player",
              bonusClaimed: asReferre.bonusClaimed,
            }
          : null,
        referrals: (asReferrer || []).map((r) => ({
          playerId: r.refereeId,
          username: r.referee.user?.username || "Player",
          bonusClaimed: r.bonusClaimed,
        })),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

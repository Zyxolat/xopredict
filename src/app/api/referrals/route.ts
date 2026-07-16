/**
 * POST /api/referrals - Create or claim referral
 * GET /api/referrals - Get referral info
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addressSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { playerAddress, referrerAddress } = await req.json();

    // Validate addresses
    const playerParsed = addressSchema.safeParse(playerAddress);
    const referrerParsed = referrerAddress
      ? addressSchema.safeParse(referrerAddress)
      : { success: true, data: null };

    if (!playerParsed.success || (referrerAddress && !referrerParsed.success)) {
      return NextResponse.json({ error: "Invalid address format" }, { status: 400 });
    }

    const player = playerParsed.data.toLowerCase();
    const referrer = referrerParsed.data?.toLowerCase();

    // Check if player already has a referrer
    const existingReferral = await prisma.referral.findUnique({
      where: { refereeAddress: player },
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
        where: { address: referrer },
      });

      if (!referrerPlayer) {
        return NextResponse.json({ error: "Referrer not found" }, { status: 404 });
      }

      // Create referral relationship
      const referral = await prisma.referral.create({
        data: {
          referrerAddress: referrer,
          refereeAddress: player,
          bonusClaimed: false,
        },
      });

      return NextResponse.json({
        data: {
          referralId: referral.id,
          referrerAddress: referrer,
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
    const address = req.nextUrl.searchParams.get("address");
    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const parsed = addressSchema.safeParse(address);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const playerAddress = parsed.data.toLowerCase();

    // Get referral info as referee
    const asReferre = await prisma.referral.findUnique({
      where: { refereeAddress: playerAddress },
      include: { referrer: { select: { username: true } } },
    });

    // Get referrals made as referrer
    const asReferrer = await prisma.referral.findMany({
      where: { referrerAddress: playerAddress },
      include: { referee: { select: { username: true } } },
    });

    return NextResponse.json({
      data: {
        referrer: asReferre
          ? {
              address: asReferre.referrerAddress,
              username: asReferre.referrer.username,
              bonusClaimed: asReferre.bonusClaimed,
            }
          : null,
        referrals: asReferrer.map((r) => ({
          address: r.refereeAddress,
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

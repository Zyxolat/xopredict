/**
 * GET /api/vip - Get VIP pass info
 * POST /api/vip/purchase - Buy VIP pass
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addressSchema } from "@/lib/validation";

const VIP_PASS_PRICE = 10; // 10 USDm/month
const VIP_DURATION_DAYS = 30;

interface VipPass {
  address: string;
  active: boolean;
  expiresAt: Date | null;
  fee: number;
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get("address");

    if (!address) {
      return NextResponse.json({
        data: {
          vipPass: null,
          price: VIP_PASS_PRICE,
          duration: VIP_DURATION_DAYS,
          benefits: [
            "0% fee on all bets",
            "Private arenas",
            "Early season access",
          ],
        },
      });
    }

    const parsed = addressSchema.safeParse(address);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const playerAddress = parsed.data.toLowerCase();
    const player = await prisma.player.findUnique({
      where: { address: playerAddress },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Check if player has VIP pass (for now, we'll use a simple flag or expiry)
    // In production, add vipExpiresAt field to Player model
    const vipPass: VipPass = {
      address: playerAddress,
      active: false, // TODO: add vipExpiresAt to Player model
      expiresAt: null,
      fee: 0,
    };

    return NextResponse.json({
      data: {
        vipPass,
        price: VIP_PASS_PRICE,
        duration: VIP_DURATION_DAYS,
        benefits: [
          "0% fee on all bets",
          "Private arenas",
          "Early season access",
        ],
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();

    const parsed = addressSchema.safeParse(address);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const playerAddress = parsed.data.toLowerCase();
    const player = await prisma.player.findUnique({
      where: { address: playerAddress },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const balance = Number(player.totalWonUsdm);
    if (balance < VIP_PASS_PRICE) {
      return NextResponse.json(
        {
          error: "Insufficient balance",
          required: VIP_PASS_PRICE,
          balance,
        },
        { status: 400 }
      );
    }

    // In production: transfer USDm, set vipExpiresAt
    // For now: just record the intent
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + VIP_DURATION_DAYS);

    return NextResponse.json(
      {
        data: {
          message: "VIP pass purchased",
          playerAddress,
          expiresAt,
          price: VIP_PASS_PRICE,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

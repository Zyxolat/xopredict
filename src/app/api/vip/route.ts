/**
 * GET /api/vip - Get VIP pass info
 * POST /api/vip/purchase - Buy VIP pass
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addressSchema } from "@/lib/validation";
import { Decimal } from "@prisma/client/runtime/library";

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

    // Check if player has active VIP pass
    const now = new Date();
    const isVipActive = player.vipExpiresAt && player.vipExpiresAt > now;

    const vipPass: VipPass = {
      address: playerAddress,
      active: isVipActive || false,
      expiresAt: player.vipExpiresAt,
      fee: isVipActive ? 0 : 5, // VIP = 0% fee, non-VIP = 5% fee on bets
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
          error: `Insufficient balance. Need ${VIP_PASS_PRICE} USDm, have ${balance.toFixed(2)} USDm`,
        },
        { status: 400 }
      );
    }

    // Check if already active
    const now = new Date();
    if (player.vipExpiresAt && player.vipExpiresAt > now) {
      return NextResponse.json(
        { error: "VIP pass already active" },
        { status: 409 }
      );
    }

    // Calculate new expiry (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + VIP_DURATION_DAYS);

    // Update player with VIP expiry and deduct cost
    const updated = await prisma.player.update({
      where: { address: playerAddress },
      data: {
        vipExpiresAt: expiresAt,
        totalWonUsdm: player.totalWonUsdm.sub(new Decimal(VIP_PASS_PRICE)),
      },
    });

    return NextResponse.json({
      data: {
        message: "VIP pass purchased",
        vipExpiresAt: expiresAt.toISOString(),
        newBalance: (Number(updated.totalWonUsdm)).toFixed(2),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

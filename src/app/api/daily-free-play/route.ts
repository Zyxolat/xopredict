/**
 * POST /api/daily-free-play - Claim daily free play with streak multiplier
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isEligibleForFreePlay,
  calculateDailyMultiplier,
  calculateFreePlayAmount,
} from "@/lib/gamification";
import { addressSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

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

    if (player.isBanned) {
      return NextResponse.json({ error: "Account banned" }, { status: 403 });
    }

    // Check eligibility
    if (!isEligibleForFreePlay(player.lastFreePlay)) {
      const nextAvailable = new Date(player.lastFreePlay!);
      nextAvailable.setHours(nextAvailable.getHours() + 24);
      return NextResponse.json(
        { error: "Already claimed today", nextAvailable: nextAvailable.toISOString() },
        { status: 429 }
      );
    }

    // Calculate free play amount with streak multiplier
    const multiplier = calculateDailyMultiplier(player.streakDays);
    const freePlayAmount = calculateFreePlayAmount(multiplier);

    // Create free play record
    const round = await prisma.round.create({
      data: {
        roundId: BigInt(Date.now()),
        type: "solo",
        commitHash: "free-play",
        status: "available",
        numbers: [],
      },
    });

    // Update player
    await prisma.player.update({
      where: { address: playerAddress },
      data: {
        lastFreePlay: new Date(),
        streakDays: player.streakDays + 1,
      },
    });

    return NextResponse.json({
      data: {
        freePlayAmount,
        multiplier,
        streakDays: player.streakDays + 1,
        roundId: round.id,
      },
    });
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

    const player = await prisma.player.findUnique({
      where: { address: parsed.data.toLowerCase() },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const eligible = isEligibleForFreePlay(player.lastFreePlay);
    let nextAvailable = null;
    if (!eligible && player.lastFreePlay) {
      nextAvailable = new Date(player.lastFreePlay);
      nextAvailable.setHours(nextAvailable.getHours() + 24);
    }

    const multiplier = calculateDailyMultiplier(player.streakDays);
    const freePlayAmount = calculateFreePlayAmount(multiplier);

    return NextResponse.json({
      data: {
        eligible,
        nextAvailable,
        streakDays: player.streakDays,
        multiplier,
        freePlayAmount,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

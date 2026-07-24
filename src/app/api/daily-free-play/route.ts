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
import { playerIdSchema } from "@/lib/validation";
import { requireSelf, assertSelf, requireSession } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const { playerId } = await req.json();
    const parsed = playerIdSchema.safeParse(playerId);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid Player ID" }, { status: 400 });
    }

    const fail = assertSelf(auth, parsed.data);
    if (fail) return fail.response;

    const player = await prisma.player.findUnique({
      where: { id: parsed.data },
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
      where: { id: parsed.data },
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
    const playerId = req.nextUrl.searchParams.get("playerId");
    if (!playerId) {
      return NextResponse.json({ error: "Player ID required" }, { status: 400 });
    }

    const parsed = playerIdSchema.safeParse(playerId);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid Player ID" }, { status: 400 });
    }

    const auth = await requireSelf(parsed.data);
    if (!auth.ok) return auth.response;

    const player = await prisma.player.findUnique({
      where: { id: parsed.data },
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

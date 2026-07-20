/**
 * POST /api/players/[playerId]/onboard - Mark player as onboarded
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { playerId: string } }
) {
  try {
    const playerId = params.playerId;

    // Update player onboarded flag
    const player = await prisma.player.update({
      where: { id: playerId },
      data: { onboarded: true },
    });

    return NextResponse.json({ data: player });
  } catch (error) {
    console.error("Onboard error:", error);
    return NextResponse.json(
      { error: "Failed to mark player as onboarded" },
      { status: 500 }
    );
  }
}

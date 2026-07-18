/**
 * POST /api/players/[address]/onboard - Mark player as onboarded
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const address = params.address.toLowerCase();

    // Update player onboarded flag
    const player = await prisma.player.update({
      where: { address },
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

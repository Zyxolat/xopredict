/**
 * POST /api/players/[playerId]/onboard - Mark player as onboarded
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { playerIdSchema } from "@/lib/validation";
import { requireSelf } from "@/lib/api-auth";

export async function POST(
  request: Request,
  { params }: { params: { playerId: string } }
) {
  try {
    const parsed = playerIdSchema.safeParse(params.playerId);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });
    }

    const auth = await requireSelf(parsed.data);
    if (!auth.ok) return auth.response;

    const playerId = parsed.data;

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

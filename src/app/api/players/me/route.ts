/**
 * GET /api/players/me - Get current authenticated player profile
 */
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    if (!auth.player) {
      return NextResponse.json(
        { error: "Player profile not found for this account" },
        { status: 404 }
      );
    }

    const player = await prisma.player.findUnique({
      where: { id: auth.player.id },
    });

    return NextResponse.json({ data: player });
  } catch (error) {
    console.error("GET /api/players/me error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

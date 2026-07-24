/**
 * POST /api/admin - Admin controls
 * - Emergency pause
 * - Blacklist/ban address
 * - Manual refund
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { playerIdSchema } from "@/lib/validation";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { action, playerId } = await req.json();

    switch (action) {
      case "ban": {
        const parsed = playerIdSchema.safeParse(playerId);
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid Player ID" }, { status: 400 });
        }

        const player = await prisma.player.update({
          where: { id: parsed.data },
          data: { isBanned: true },
        });

        return NextResponse.json({
          data: { message: "Player banned", id: player.id },
        });
      }

      case "unban": {
        const parsed = playerIdSchema.safeParse(playerId);
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid Player ID" }, { status: 400 });
        }

        const player = await prisma.player.update({
          where: { id: parsed.data },
          data: { isBanned: false },
        });

        return NextResponse.json({
          data: { message: "Player unbanned", id: player.id },
        });
      }

      case "refund": {
        const parsed = playerIdSchema.safeParse(playerId);
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid Player ID" }, { status: 400 });
        }

        const { amount } = await req.json();
        if (!amount || amount <= 0) {
          return NextResponse.json(
            { error: "Invalid refund amount" },
            { status: 400 }
          );
        }

        const player = await prisma.player.findUnique({
          where: { id: parsed.data },
        });

        if (!player) {
          return NextResponse.json({ error: "Player not found" }, { status: 404 });
        }

        // In production: transfer from treasury
        const updated = await prisma.player.update({
          where: { id: parsed.data },
          data: {
            totalWonUsdm: player.totalWonUsdm.plus(amount),
          },
        });

        return NextResponse.json({
          data: {
            message: "Refund issued",
            id: updated.id,
            refundAmount: amount,
            newBalance: updated.totalWonUsdm,
          },
        });
      }

      case "stats": {
        const playerCount = await prisma.player.count();
        const totalBets = await prisma.round.count();
        const banCount = await prisma.player.count({ where: { isBanned: true } });

        return NextResponse.json({
          data: {
            playerCount,
            totalBets,
            bannedCount: banCount,
            timestamp: new Date(),
          },
        });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

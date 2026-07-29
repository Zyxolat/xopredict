/**
 * GET & POST /api/admin - Admin control panel
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { playerIdSchema } from "@/lib/validation";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const playerCount = await prisma.user.count();
    const totalBets = await prisma.round.count();
    const banCount = await prisma.user.count({ where: { status: "BANNED" } });
    const activeArenas = await prisma.arena.count({ where: { status: "OPEN" } });

    return NextResponse.json({
      data: {
        playerCount,
        totalBets,
        bannedCount: banCount,
        activeArenas,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error("GET /api/admin error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

        if (player.userId) {
          await prisma.user.update({
            where: { id: player.userId },
            data: { status: "BANNED" },
          });
        }

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

        if (player.userId) {
          await prisma.user.update({
            where: { id: player.userId },
            data: { status: "ACTIVE" },
          });
        }

        return NextResponse.json({
          data: { message: "Player unbanned", id: player.id },
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

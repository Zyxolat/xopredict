/**
 * GET /api/private-arenas - List user's private arenas or search by invite code
 * POST /api/private-arenas - Create private arena with invite code (Persisted in Prisma DB)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { playerIdSchema } from "@/lib/validation";
import crypto from "crypto";
import { requireSession, requireSelf, assertSelf } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const playerId = req.nextUrl.searchParams.get("playerId");
    const code = req.nextUrl.searchParams.get("code");

    if (code) {
      // Joining by invite code: any authenticated player may use a code.
      const auth = await requireSession();
      if (!auth.ok) return auth.response;

      const arena = await prisma.privateArena.findUnique({
        where: { inviteCode: code },
      });

      if (!arena) {
        return NextResponse.json(
          { error: "Invite code not found" },
          { status: 404 }
        );
      }

      if (arena.status === "full") {
        return NextResponse.json(
          { error: "Arena is full" },
          { status: 409 }
        );
      }

      return NextResponse.json({ data: { arena } });
    }

    if (!playerId) {
      return NextResponse.json({ error: "Player ID required" }, { status: 400 });
    }

    const parsed = playerIdSchema.safeParse(playerId);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });
    }

    const auth = await requireSelf(parsed.data);
    if (!auth.ok) return auth.response;

    const pId = parsed.data;
    const userArenas = await prisma.privateArena.findMany({
      where: { creatorId: pId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      data: { arenas: userArenas },
    });
  } catch (error) {
    console.error("[API GET /api/private-arenas] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const { playerId, betAmount, maxPlayers } = await req.json();

    const parsed = playerIdSchema.safeParse(playerId);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });
    }

    const fail = assertSelf(auth, parsed.data);
    if (fail) return fail.response;

    const pId = parsed.data;
    const player = await prisma.player.findUnique({
      where: { id: pId },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Validate bet and player count
    if (betAmount <= 0 || betAmount > 100) {
      return NextResponse.json({ error: "Invalid bet amount" }, { status: 400 });
    }

    if (maxPlayers < 2 || maxPlayers > 6) {
      return NextResponse.json({ error: "Invalid player count" }, { status: 400 });
    }

    // Generate invite code
    const inviteCode = crypto.randomBytes(6).toString("hex").toUpperCase();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const arena = await prisma.privateArena.create({
      data: {
        creatorId: pId,
        inviteCode,
        betAmount,
        maxPlayers,
        currentPlayers: 1,
        status: "active",
        playerIds: [pId],
        expiresAt,
      },
    });

    return NextResponse.json(
      {
        data: {
          arena,
          joinUrl: `https://xolat.game/arena?code=${inviteCode}`,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API POST /api/private-arenas] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

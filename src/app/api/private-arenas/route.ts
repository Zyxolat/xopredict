/**
 * GET /api/private-arenas - List user's private arenas
 * POST /api/private-arenas - Create private arena with invite code
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { playerIdSchema } from "@/lib/validation";
import { requireSession, assertSelf } from "@/lib/api-auth";
import { Decimal } from "@prisma/client/runtime/library";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const PRIVATE_ARENA_TTL_HOURS = 24;

export async function GET(req: NextRequest) {
  try {
    const playerId = req.nextUrl.searchParams.get("playerId");
    const code = req.nextUrl.searchParams.get("code");

    if (code) {
      // Join arena by code (requires a valid session, but no ownership check —
      // any authenticated user may look up an arena by its invite code).
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

    const auth = await requireSession();
    if (!auth.ok) return auth.response;
    const forbidden = assertSelf(auth, parsed.data);
    if (forbidden) return forbidden.response;

    const pId = parsed.data;

    // Get user's arenas
    const userArenas = await prisma.privateArena.findMany({
      where: { creatorId: pId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      data: { arenas: userArenas },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { playerId, betAmount, maxPlayers } = await req.json();

    const parsed = playerIdSchema.safeParse(playerId);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });
    }

    const auth = await requireSession();
    if (!auth.ok) return auth.response;
    const forbidden = assertSelf(auth, parsed.data);
    if (forbidden) return forbidden.response;

    const pId = parsed.data;
    const player = await prisma.player.findUnique({
      where: { id: pId },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Validate bet and player count
    if (typeof betAmount !== "number" || betAmount <= 0 || betAmount > 100) {
      return NextResponse.json({ error: "Invalid bet amount" }, { status: 400 });
    }

    if (typeof maxPlayers !== "number" || maxPlayers < 2 || maxPlayers > 6) {
      return NextResponse.json({ error: "Invalid player count" }, { status: 400 });
    }

    // Generate invite code
    const inviteCode = crypto.randomBytes(6).toString("hex").toUpperCase();

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + PRIVATE_ARENA_TTL_HOURS);

    const arena = await prisma.privateArena.create({
      data: {
        creatorId: pId,
        inviteCode,
        betAmount: new Decimal(betAmount),
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
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

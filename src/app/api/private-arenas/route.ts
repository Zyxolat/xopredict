/**
 * GET /api/private-arenas - List user's private arenas
 * POST /api/private-arenas - Create private arena with invite code
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { playerIdSchema } from "@/lib/validation";
import crypto from "crypto";
import { requireSession, requireSelf, assertSelf } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

interface PrivateArena {
  id: string;
  creatorId: string;
  inviteCode: string;
  betAmount: number;
  maxPlayers: number;
  currentPlayers: number;
  status: "active" | "full" | "completed";
  createdAt: Date;
}

// For production, store in database
const privateArenas = new Map<string, PrivateArena>();

export async function GET(req: NextRequest) {
  try {
    const playerId = req.nextUrl.searchParams.get("playerId");
    const code = req.nextUrl.searchParams.get("code");

    if (code) {
      // Joining by invite code: any authenticated player may use a code.
      const auth = await requireSession();
      if (!auth.ok) return auth.response;

      const arena = Array.from(privateArenas.values()).find(
        (a) => a.inviteCode === code
      );

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
    const userArenas = Array.from(privateArenas.values()).filter(
      (a) => a.creatorId === pId
    );

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

    const arena: PrivateArena = {
      id: crypto.randomUUID(),
      creatorId: pId,
      inviteCode,
      betAmount,
      maxPlayers,
      currentPlayers: 1,
      status: "active",
      createdAt: new Date(),
    };

    privateArenas.set(arena.id, arena);

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

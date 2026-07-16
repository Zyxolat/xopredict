/**
 * GET /api/private-arenas - List user's private arenas
 * POST /api/private-arenas - Create private arena with invite code
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addressSchema } from "@/lib/validation";
import crypto from "crypto";

export const dynamic = "force-dynamic";

interface PrivateArena {
  id: string;
  creatorAddress: string;
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
    const address = req.nextUrl.searchParams.get("address");
    const code = req.nextUrl.searchParams.get("code");

    if (code) {
      // Join arena by code
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

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const parsed = addressSchema.safeParse(address);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const playerAddress = parsed.data.toLowerCase();

    // Get user's arenas
    const userArenas = Array.from(privateArenas.values()).filter(
      (a) => a.creatorAddress === playerAddress
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
    const { address, betAmount, maxPlayers } = await req.json();

    const parsed = addressSchema.safeParse(address);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const playerAddress = parsed.data.toLowerCase();
    const player = await prisma.player.findUnique({
      where: { address: playerAddress },
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
      creatorAddress: playerAddress,
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

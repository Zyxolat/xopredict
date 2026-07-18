/**
 * GET /api/private-arenas - List user's private arenas or get arena by code
 * POST /api/private-arenas - Create private arena with invite code
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addressSchema } from "@/lib/validation";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Arena expires 30 minutes after creation if not fully joined
const ARENA_TIMEOUT_MS = 30 * 60 * 1000;

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get("address");
    const code = req.nextUrl.searchParams.get("code");

    if (code) {
      // Get arena by invite code
      const arena = await prisma.privateArena.findUnique({
        where: { inviteCode: code },
      });

      if (!arena) {
        return NextResponse.json(
          { error: "Invite code not found" },
          { status: 404 }
        );
      }

      // Check if arena has expired
      if (new Date() > arena.expiresAt) {
        await prisma.privateArena.delete({
          where: { id: arena.id },
        });
        return NextResponse.json(
          { error: "Arena invite has expired" },
          { status: 410 }
        );
      }

      if (arena.status === "full") {
        return NextResponse.json(
          { error: "Arena is full", data: { arena } },
          { status: 409 }
        );
      }

      return NextResponse.json({
        data: {
          arena: {
            id: arena.id,
            creatorAddress: arena.creatorAddress,
            inviteCode: arena.inviteCode,
            betAmount: arena.betAmount.toString(),
            maxPlayers: arena.maxPlayers,
            currentPlayers: arena.currentPlayers,
            status: arena.status,
            playerCount: arena.players.length,
          },
        },
      });
    }

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const parsed = addressSchema.safeParse(address);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const playerAddress = parsed.data.toLowerCase();

    // Get user's active arenas
    const userArenas = await prisma.privateArena.findMany({
      where: {
        creatorAddress: playerAddress,
        status: { in: ["active", "full"] },
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter out expired arenas and delete them
    const now = new Date();
    for (const arena of userArenas) {
      if (now > arena.expiresAt) {
        await prisma.privateArena.delete({
          where: { id: arena.id },
        });
      }
    }

    const activeArenas = userArenas
      .filter((a: typeof userArenas[number]) => now <= a.expiresAt)
      .map((arena: typeof userArenas[number]) => ({
        id: arena.id,
        creatorAddress: arena.creatorAddress,
        inviteCode: arena.inviteCode,
        betAmount: arena.betAmount.toString(),
        maxPlayers: arena.maxPlayers,
        currentPlayers: arena.currentPlayers,
        status: arena.status,
        playerCount: arena.players.length,
        createdAt: arena.createdAt,
      }));

    return NextResponse.json({
      data: { arenas: activeArenas },
    });
  } catch (error) {
    console.error("GET /api/private-arenas error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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

    // Generate unique invite code
    let inviteCode = "";
    let isUnique = false;
    while (!isUnique) {
      inviteCode = crypto.randomBytes(6).toString("hex").toUpperCase();
      const existing = await prisma.privateArena.findUnique({
        where: { inviteCode },
      });
      isUnique = !existing;
    }

    // Create arena in database
    const expiresAt = new Date(Date.now() + ARENA_TIMEOUT_MS);
    const arena = await prisma.privateArena.create({
      data: {
        creatorAddress: playerAddress,
        inviteCode,
        betAmount: betAmount.toString(),
        maxPlayers,
        currentPlayers: 1,
        status: "active",
        players: [playerAddress], // Array of player addresses
        expiresAt,
      },
    });

    return NextResponse.json(
      {
        data: {
          arena: {
            id: arena.id,
            creatorAddress: arena.creatorAddress,
            inviteCode: arena.inviteCode,
            betAmount: arena.betAmount.toString(),
            maxPlayers: arena.maxPlayers,
            currentPlayers: arena.currentPlayers,
            status: arena.status,
            playerCount: arena.players.length,
            expiresAt: arena.expiresAt,
          },
          joinUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://xolat.game"}/arena?code=${inviteCode}`,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/private-arenas error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

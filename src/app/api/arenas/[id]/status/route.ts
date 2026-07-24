import { NextRequest, NextResponse } from "next/server";
import { ArenaService } from "@/lib/services/arena";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const identifier = params.id;
    let arena = await ArenaService.getArenaByIdentifier(identifier);

    if (!arena) {
      return NextResponse.json({ error: "Arena not found" }, { status: 404 });
    }

    // Synchronize DB record with on-chain smart contract status
    arena = (await ArenaService.syncOnChainArenaState(arena.arenaId)) || arena;

    const serialized = JSON.parse(
      JSON.stringify(arena, (_, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );

    return NextResponse.json({
      data: {
        arena: serialized,
        status: arena.status,
        currentPlayers: arena.currentPlayers,
        maxPlayers: arena.maxPlayers,
      },
    });
  } catch (error) {
    console.error(`[API GET /api/arenas/${params.id}/status] Error:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

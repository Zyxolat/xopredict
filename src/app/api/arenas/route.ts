import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, assertOwnsAddress } from "@/lib/api-auth";
import { ArenaService } from "@/lib/services/arena";
import { DbArenaStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const createArenaSchema = z.object({
  arenaId: z.coerce.bigint().positive(),
  betAmount: z.string().regex(/^\d+(\.\d{1,18})?$/),
  maxPlayers: z.number().int().min(2).max(4),
  creatorAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  commitment: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const statusParam = searchParams.get("status")?.toUpperCase() as DbArenaStatus | undefined;

    const validStatuses: DbArenaStatus[] = [
      "OPEN",
      "FULL",
      "PICKING",
      "RANDOMNESS_REQUESTED",
      "REVEALED",
      "SETTLED",
      "REFUNDED",
      "EXPIRED",
    ];

    const status = statusParam && validStatuses.includes(statusParam) ? statusParam : undefined;

    const result = await ArenaService.getPublicArenas({ page, limit, status });

    // Custom serializer for BigInt JSON response
    const serialized = JSON.parse(
      JSON.stringify(result, (_, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );

    return NextResponse.json({ data: serialized });
  } catch (error) {
    console.error("[API GET /api/arenas] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = createArenaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 }
      );
    }

    const input = parsed.data;

    const ownership = assertOwnsAddress(auth, input.creatorAddress);
    if (ownership) return ownership.response;

    const arena = await ArenaService.createArena({
      arenaId: input.arenaId,
      creatorAddress: input.creatorAddress,
      betAmount: input.betAmount,
      maxPlayers: input.maxPlayers,
    });

    const serialized = JSON.parse(
      JSON.stringify(arena, (_, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );

    return NextResponse.json({ data: serialized }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[API POST /api/arenas] Error:", message);
    return NextResponse.json({ error: message || "Internal server error" }, { status: 400 });
  }
}

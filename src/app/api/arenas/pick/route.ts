import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { ArenaService } from "@/lib/services/arena";

export const dynamic = "force-dynamic";

const pickCardSchema = z.object({
  arenaId: z.coerce.bigint().positive(),
  playerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  cardIndex: z.number().int().min(0).max(3),
});

export async function POST(request: Request) {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = pickCardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 }
      );
    }

    const input = parsed.data;

    const updatedArena = await ArenaService.pickArenaCard({
      arenaId: input.arenaId,
      playerAddress: input.playerAddress,
      cardIndex: input.cardIndex,
    });

    const serialized = JSON.parse(
      JSON.stringify(updatedArena, (_, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );

    return NextResponse.json({ data: { arena: serialized } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[API POST /api/arenas/pick] Error:", message);
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

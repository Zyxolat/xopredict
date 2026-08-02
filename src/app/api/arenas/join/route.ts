import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, assertOwnsAddress } from "@/lib/api-auth";
import { ArenaService } from "@/lib/services/arena";

export const dynamic = "force-dynamic";

const joinArenaSchema = z.object({
  arenaId: z.coerce.bigint().positive(),
  playerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

export async function POST(request: Request) {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = joinArenaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 }
      );
    }

    const input = parsed.data;

    const ownership = assertOwnsAddress(auth, input.playerAddress);
    if (ownership) return ownership.response;

    const updatedArena = await ArenaService.joinArena({
      arenaId: input.arenaId,
      playerAddress: input.playerAddress,
    });

    const serialized = JSON.parse(
      JSON.stringify(updatedArena, (_, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );

    return NextResponse.json({ data: { arena: serialized } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[API POST /api/arenas/join] Error:", message);
    const status = message.includes("not found")
      ? 404
      : message.includes("already joined") || message.includes("full")
      ? 409
      : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

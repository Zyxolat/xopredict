import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { playerIdSchema } from "@/lib/validation";
import { requireSession, assertSelf } from "@/lib/api-auth";
import { registerSoloPlayedEvent } from "@/lib/keeper/listener";

export const dynamic = "force-dynamic";
const soloSchema = z.object({
  roundId: z.coerce.bigint().positive(),
  playerId: playerIdSchema,
  cardIndex: z.number().int().min(0).max(1),
  betAmount: z.string().optional().default("1"),
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

export async function POST(request: Request) {
  // Check session before consuming the body so the body stream isn't read twice.
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const parsed = soloSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid solo round" }, { status: 400 });

  const fail = assertSelf(auth, parsed.data.playerId);
  if (fail) return fail.response;

  const input = parsed.data;
  const player = await prisma.player.update({
    where: { id: input.playerId },
    data: { totalPlayed: { increment: 1 } },
  });

  // Register keeper job for automated on-chain randomness lifecycle execution
  if (player.address) {
    void registerSoloPlayedEvent({
      roundId: input.roundId,
      playerAddress: player.address,
      betAmount: input.betAmount,
      cardIndex: input.cardIndex,
    }).catch((err) => {
      console.error("[API Solo] Failed to register keeper job:", err);
    });
  }

  return NextResponse.json(
    { data: { player: player.id, transactionHash: input.transactionHash, roundId: input.roundId.toString() } },
    { status: 201 }
  );
}

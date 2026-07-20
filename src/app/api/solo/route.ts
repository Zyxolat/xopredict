import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { playerIdSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
const soloSchema = z.object({ roundId: z.coerce.bigint().positive(), playerId: playerIdSchema, cardIndex: z.number().int().min(0).max(1), transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/) });

export async function POST(request: Request) {
  const parsed = soloSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid solo round" }, { status: 400 });
  const input = parsed.data;
  const player = await prisma.player.update({ 
    where: { id: input.playerId }, 
    data: { totalPlayed: { increment: 1 } }
  });
  return NextResponse.json({ data: { player: player.id, transactionHash: input.transactionHash } }, { status: 201 });
}

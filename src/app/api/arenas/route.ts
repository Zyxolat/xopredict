import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const createArenaSchema = z.object({ roundId: z.coerce.bigint().positive(), betAmount: z.string().regex(/^\d+(\.\d{1,18})?$/), maxPlayers: z.number().int().min(2).max(6), transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/), commitment: z.string().min(10) });

export async function POST(request: Request) {
  const parsed = createArenaSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const input = parsed.data;
  const round = await prisma.round.create({ data: { roundId: input.roundId, type: "arena", commitHash: input.commitment, numbers: [], potUsdm: input.betAmount, txHash: input.transactionHash, status: "waiting" } });
  return NextResponse.json({ data: round }, { status: 201 });
}

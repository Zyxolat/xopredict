import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const soloSchema = z.object({ roundId: z.coerce.bigint().positive(), address: z.string().regex(/^0x[a-fA-F0-9]{40}$/), cardIndex: z.number().int().min(0).max(1), transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/) });

export async function POST(request: Request) {
  const parsed = soloSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid solo round" }, { status: 400 });
  const input = parsed.data;
  const player = await prisma.player.upsert({ where: { address: input.address.toLowerCase() }, update: { totalPlayed: { increment: 1 } }, create: { address: input.address.toLowerCase(), totalPlayed: 1 } });
  return NextResponse.json({ data: { player: player.address, transactionHash: input.transactionHash } }, { status: 201 });
}

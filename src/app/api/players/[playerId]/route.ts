import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { playerIdSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { playerId: string } }) {
  const parsed = playerIdSchema.safeParse(params.playerId);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const player = await prisma.player.findUnique({ where: { id: parsed.data } });
  return NextResponse.json({ data: player });
}

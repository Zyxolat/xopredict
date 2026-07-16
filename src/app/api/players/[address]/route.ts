import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addressSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { address: string } }) {
  const parsed = addressSchema.safeParse(params.address);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const player = await prisma.player.findUnique({ where: { address: parsed.data.toLowerCase() } });
  return NextResponse.json({ data: player });
}

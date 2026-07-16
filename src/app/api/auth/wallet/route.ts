import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const requestSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  message: z.string().min(16).max(500),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid wallet authentication request" }, { status: 400 });
  const { address, message, signature } = parsed.data;
  if (!message.includes(address) || !message.includes("Xolat")) return NextResponse.json({ error: "Invalid sign-in message" }, { status: 400 });
  const valid = await verifyMessage({ address: address as `0x${string}`, message, signature: signature as `0x${string}` });
  if (!valid) return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
  const player = await prisma.player.upsert({ where: { address: address.toLowerCase() }, update: {}, create: { address: address.toLowerCase() } });
  return NextResponse.json({ data: player });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const rounds = await prisma.round.findMany({ orderBy: { createdAt: "desc" }, take: 25 });
  return NextResponse.json({ data: rounds });
}

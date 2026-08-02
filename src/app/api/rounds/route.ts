import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const address = auth.player?.address?.toLowerCase();
  if (!address) {
    return NextResponse.json({ data: [] });
  }

  // Round rows don't carry a direct player/user link (only winnerAddress after
  // settlement), so participation is derived from the two places a player's
  // address is actually recorded against a roundId: KeeperJob (solo games)
  // and Arena.players (arena games, joined via Arena.roundId once settled).
  const [soloJobs, arenas] = await Promise.all([
    prisma.keeperJob.findMany({
      where: { roundId: { not: null }, playerAddress: { equals: address, mode: "insensitive" } },
      select: { roundId: true },
    }),
    prisma.arena.findMany({
      where: { roundId: { not: null }, players: { has: address } },
      select: { roundId: true },
    }),
  ]);

  const roundIds = Array.from(
    new Set(
      [...soloJobs, ...arenas]
        .map((r) => r.roundId)
        .filter((id): id is bigint => id !== null)
    )
  );

  if (roundIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const rounds = await prisma.round.findMany({
    where: { roundId: { in: roundIds } },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  const serialized = JSON.parse(
    JSON.stringify(rounds, (_, value) => (typeof value === "bigint" ? value.toString() : value))
  );

  return NextResponse.json({ data: serialized });
}

import { NextRequest, NextResponse } from "next/server";
import { ArenaService } from "@/lib/services/arena";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export type ProductionArenaStatus =
  | "WAITING_FOR_PLAYERS"
  | "WAITING_FOR_CARD_PICKS"
  | "REQUESTING_RANDOMNESS"
  | "WAITING_FOR_WITNET"
  | "FETCHING_RANDOMNESS"
  | "SETTLING"
  | "COMPLETED"
  | "REFUNDED"
  | "EXPIRED";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const identifier = params.id;
    let arena = await ArenaService.getArenaByIdentifier(identifier);

    if (!arena) {
      return NextResponse.json({ error: "Arena not found" }, { status: 404 });
    }

    // Synchronize DB record with on-chain smart contract status
    arena = (await ArenaService.syncOnChainArenaState(arena.arenaId)) || arena;

    // Find associated KeeperJob if model is present
    const keeperJob = prisma.keeperJob
      ? await prisma.keeperJob.findFirst({
          where: {
            OR: [
              { arenaId: arena.arenaId },
              ...(arena.roundId ? [{ roundId: arena.roundId }] : []),
            ],
          },
        })
      : null;

    let productionStatus: ProductionArenaStatus = "WAITING_FOR_PLAYERS";

    if (arena.status === "REFUNDED") {
      productionStatus = "REFUNDED";
    } else if (arena.status === "EXPIRED") {
      productionStatus = "EXPIRED";
    } else if (arena.status === "SETTLED" || (keeperJob && keeperJob.stage === "COMPLETED")) {
      productionStatus = "COMPLETED";
    } else if (keeperJob) {
      switch (keeperJob.stage) {
        case "WAIT_FOR_FULL_ARENA":
          productionStatus = "WAITING_FOR_PLAYERS";
          break;
        case "WAIT_FOR_ALL_CARD_PICKS":
          productionStatus = "WAITING_FOR_CARD_PICKS";
          break;
        case "REQUEST_RANDOMNESS":
          productionStatus = "REQUESTING_RANDOMNESS";
          break;
        case "AWAIT_WITNET":
          productionStatus = "WAITING_FOR_WITNET";
          break;
        case "FETCH_RANDOMNESS":
          productionStatus = "FETCHING_RANDOMNESS";
          break;
        case "SETTLE_ARENA":
        case "SETTLE_ROUND":
        case "SYNC_DATABASE":
          productionStatus = "SETTLING";
          break;
        case "COMPLETED":
          productionStatus = "COMPLETED";
          break;
        case "REFUNDED":
          productionStatus = "REFUNDED";
          break;
        default:
          productionStatus = "WAITING_FOR_PLAYERS";
          break;
      }
    } else {
      if (arena.status === "OPEN") {
        productionStatus = arena.currentPlayers >= arena.maxPlayers ? "WAITING_FOR_CARD_PICKS" : "WAITING_FOR_PLAYERS";
      } else if (arena.status === "FULL" || arena.status === "PICKING") {
        productionStatus = "WAITING_FOR_CARD_PICKS";
      } else if (arena.status === "RANDOMNESS_REQUESTED") {
        productionStatus = "WAITING_FOR_WITNET";
      } else if (arena.status === "REVEALED") {
        productionStatus = "FETCHING_RANDOMNESS";
      }
    }

    const serialized = JSON.parse(
      JSON.stringify(arena, (_, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );

    return NextResponse.json({
      data: {
        arena: serialized,
        status: productionStatus,
        rawStatus: arena.status,
        keeperStage: keeperJob?.stage || null,
        keeperStatus: keeperJob?.status || null,
        requestTxHash: keeperJob?.requestTxHash || null,
        settleTxHash: keeperJob?.settleTxHash || null,
        currentPlayers: arena.currentPlayers,
        maxPlayers: arena.maxPlayers,
      },
    });
  } catch (error) {
    console.error(`[API GET /api/arenas/${params.id}/status] Error:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

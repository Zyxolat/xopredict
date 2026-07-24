import { NextResponse } from "next/server";
import { getRelayerHealth } from "@/lib/keeper/wallet";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = await getRelayerHealth();
    const statusCode = health.configured && !health.isBalanceLow ? 200 : 503;

    return NextResponse.json(
      {
        ok: health.configured && !health.isBalanceLow,
        relayer: health,
        timestamp: new Date().toISOString(),
      },
      { status: statusCode }
    );
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error("[API Keeper Health] Error:", errMessage);
    return NextResponse.json(
      { ok: false, error: "Internal health check error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { ArenaService } from "@/lib/services/arena";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const arenas = await ArenaService.getOpenArenas();
    const serialized = JSON.parse(
      JSON.stringify(arenas, (_, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );
    return NextResponse.json({ data: { arenas: serialized } });
  } catch (error) {
    console.error("[API GET /api/arenas/open] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

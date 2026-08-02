import { NextResponse } from "next/server";
import { runSystemCleanup } from "@/lib/keeper/cleanup";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const result = await runSystemCleanup(30);
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      cleaned: result,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error("[API Keeper Cleanup] Error:", errMessage);
    return NextResponse.json({ error: "System cleanup error" }, { status: 500 });
  }
}

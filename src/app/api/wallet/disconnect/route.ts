import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { removeWalletFromUser } from "@/lib/wallet-linking";

export const dynamic = "force-dynamic";

const disconnectSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
});

/**
 * POST /api/wallet/disconnect - Unlink a wallet from authenticated user account
 */
export async function POST(request: Request) {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = disconnectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input parameters" },
        { status: 400 }
      );
    }

    const { address } = parsed.data;

    await removeWalletFromUser(auth.user.id, address);

    return NextResponse.json({ message: "Wallet unlinked successfully." });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("POST /api/wallet/disconnect error:", error);
    return NextResponse.json({ error: msg || "Failed to disconnect wallet" }, { status: 400 });
  }
}

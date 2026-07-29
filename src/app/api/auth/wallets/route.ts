import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getUserWallets, removeWalletFromUser, setPrimaryWallet } from "@/lib/wallet-linking";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/wallets - List user's linked wallets
 */
export async function GET() {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const wallets = await getUserWallets(auth.user.id);
    return NextResponse.json({ data: wallets });
  } catch (error) {
    console.error("[GET /api/auth/wallets] Error:", error);
    return NextResponse.json({ error: "Failed to fetch linked wallets" }, { status: 500 });
  }
}

/**
 * DELETE /api/auth/wallets - Remove a linked wallet
 */
export async function DELETE(request: Request) {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const { address } = await request.json();
    if (!address || typeof address !== "string") {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
    }

    await removeWalletFromUser(auth.user.id, address);
    return NextResponse.json({ message: "Wallet unlinked successfully" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[DELETE /api/auth/wallets] Error:", message);
    return NextResponse.json({ error: message || "Failed to remove wallet" }, { status: 400 });
  }
}

/**
 * PATCH /api/auth/wallets - Set primary wallet
 */
export async function PATCH(request: Request) {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const { address } = await request.json();
    if (!address || typeof address !== "string") {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
    }

    const updated = await setPrimaryWallet(auth.user.id, address);
    return NextResponse.json({ message: "Primary wallet updated", data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[PATCH /api/auth/wallets] Error:", message);
    return NextResponse.json({ error: message || "Failed to set primary wallet" }, { status: 400 });
  }
}

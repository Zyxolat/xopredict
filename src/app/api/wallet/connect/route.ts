import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyMessage } from "viem";
import { requireSession } from "@/lib/api-auth";
import { linkWalletToUser } from "@/lib/wallet-linking";
import { sendWalletLinkedNotification } from "@/lib/email";

export const dynamic = "force-dynamic";

const connectSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/, "Invalid signature format"),
  nonce: z.string(),
});

/**
 * POST /api/wallet/connect - Link wallet via signature verification
 */
export async function POST(request: Request) {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = connectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input parameters" },
        { status: 400 }
      );
    }

    const { address, signature, nonce } = parsed.data;
    const walletAddress = address.toLowerCase();

    const expectedMessage = `Sign this message to link your wallet to XoPredict:\n\nNonce: ${nonce}`;
    const isValid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message: expectedMessage,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid signature. Ownership could not be verified." },
        { status: 401 }
      );
    }

    try {
      const wallet = await linkWalletToUser(auth.user.id, walletAddress);

      if (auth.user.email) {
        void sendWalletLinkedNotification(auth.user.email, walletAddress).catch(() => {});
      }

      return NextResponse.json({
        message: "Wallet linked successfully.",
        data: wallet,
      });
    } catch (linkErr: unknown) {
      const msg = linkErr instanceof Error ? linkErr.message : String(linkErr);
      if (msg.includes("already linked")) {
        return NextResponse.json(
          { error: "This wallet is already linked to another account." },
          { status: 409 }
        );
      }
      throw linkErr;
    }
  } catch (error) {
    console.error("POST /api/wallet/connect error:", error);
    return NextResponse.json({ error: "Failed to connect wallet" }, { status: 500 });
  }
}

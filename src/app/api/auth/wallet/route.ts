import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyMessage } from "viem";
import { requireSession } from "@/lib/api-auth";
import { linkWalletToUser, WalletLinkConflictError } from "@/lib/wallet-linking";
import { sendWalletLinkedNotification } from "@/lib/email";

export const dynamic = "force-dynamic";

// Temporary nonces store (in-memory for active sessions)
const nonceStore = new Map<string, { nonce: string; expiresAt: number }>();

function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * GET /api/auth/wallet - Generate signing nonce for wallet linking
 */
export async function GET() {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const nonce = generateNonce();
    nonceStore.set(auth.user.id, {
      nonce,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    return NextResponse.json({
      nonce,
      message: `Sign this message to link your wallet to XoPredict:\n\nNonce: ${nonce}`,
    });
  } catch (error) {
    console.error("[Wallet Link Nonce API] Error:", error);
    return NextResponse.json({ error: "Failed to generate nonce" }, { status: 500 });
  }
}

const linkWalletSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/, "Invalid signature format"),
  nonce: z.string(),
});

/**
 * POST /api/auth/wallet - Verify signature & link wallet to authenticated user
 */
export async function POST(request: Request) {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = linkWalletSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid request parameters" },
        { status: 400 }
      );
    }

    const { address, signature, nonce } = parsed.data;
    const walletAddress = address.toLowerCase();

    // Verify stored nonce
    const stored = nonceStore.get(auth.user.id);
    if (!stored || stored.nonce !== nonce || Date.now() > stored.expiresAt) {
      return NextResponse.json(
        { error: "Invalid or expired nonce. Please request a new nonce." },
        { status: 400 }
      );
    }
    nonceStore.delete(auth.user.id);

    // Verify signature
    const expectedMessage = `Sign this message to link your wallet to XoPredict:\n\nNonce: ${nonce}`;
    const isValid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message: expectedMessage,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid wallet signature. Ownership could not be verified." },
        { status: 401 }
      );
    }

    // Link wallet in database (strictly prevents duplicate wallet linking across accounts)
    try {
      const wallet = await linkWalletToUser(auth.user.id, walletAddress);

      // Only send notification if this is a fresh link (not idempotent same-user reconnect)
      if (auth.user.email) {
        try {
          await sendWalletLinkedNotification(auth.user.email, walletAddress);
        } catch (emailErr) {
          console.error("[Wallet Link API] Email notification error:", emailErr);
        }
      }

      return NextResponse.json({
        message: "Wallet successfully linked to your account.",
        data: wallet,
      });
    } catch (linkError: unknown) {
      // Only reject with 409 if wallet belongs to a DIFFERENT user
      if (linkError instanceof WalletLinkConflictError) {
        return NextResponse.json(
          { error: linkError.message },
          { status: 409 }
        );
      }
      throw linkError;
    }
  } catch (error: unknown) {
    console.error("[Wallet Link API] Internal error:", error);
    return NextResponse.json(
      { error: "Failed to link wallet" },
      { status: 500 }
    );
  }
}

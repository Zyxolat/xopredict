import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createOrGetWalletPlayer,
  linkWalletToUser,
  WalletLinkConflictError,
} from "@/lib/wallet-linking";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  message: z.string().min(16).max(500),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid wallet authentication request" },
      { status: 400 }
    );

  const { address, message, signature } = parsed.data;

  // Verify message structure
  if (!message.includes(address) || !message.includes("XOLAT"))
    return NextResponse.json(
      { error: "Invalid sign-in message" },
      { status: 400 }
    );

  // --- Timestamp freshness (max 5 minutes) ---
  const timestampMatch = message.match(/Timestamp:\s*(\d+)/);
  if (!timestampMatch)
    return NextResponse.json(
      { error: "Sign-in message must include a Timestamp" },
      { status: 400 }
    );
  const msgTimestamp = parseInt(timestampMatch[1], 10);
  const ageMs = Date.now() - msgTimestamp;
  if (ageMs < 0 || ageMs > 5 * 60 * 1000)
    return NextResponse.json(
      { error: "Sign-in message has expired. Please sign again." },
      { status: 400 }
    );

  // --- Nonce (prevents replay within the 5-minute window) ---
  const nonceMatch = message.match(/Nonce:\s*([a-f0-9-]{36})/);
  if (!nonceMatch)
    return NextResponse.json(
      { error: "Sign-in message must include a Nonce" },
      { status: 400 }
    );
  const nonce = nonceMatch[1];

  // Check nonce not already used
  const usedNonce = await prisma.verificationToken.findUnique({
    where: { token: nonce },
  });
  if (usedNonce)
    return NextResponse.json(
      { error: "This sign-in request has already been used." },
      { status: 400 }
    );

  // --- Cryptographic signature verification ---
  const valid = await verifyMessage({
    address: address as `0x${string}`,
    message,
    signature: signature as `0x${string}`,
  });

  if (!valid)
    return NextResponse.json(
      { error: "Signature verification failed" },
      { status: 401 }
    );

  // Consume nonce — stored for the remainder of the 5-minute window so that
  // any replay of the same signed message is rejected.
  const nonceExpiry = new Date(msgTimestamp + 5 * 60 * 1000);
  try {
    await prisma.verificationToken.create({
      data: {
        identifier: `wallet-nonce:${address.toLowerCase()}`,
        token: nonce,
        expires: nonceExpiry,
      },
    });
  } catch {
    // P2002 — duplicate token — another request with the same nonce just won the race
    return NextResponse.json(
      { error: "This sign-in request has already been used." },
      { status: 400 }
    );
  }

  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;

  try {
    const player = currentUserId
      ? await linkWalletToUser(currentUserId, address)
      : await createOrGetWalletPlayer(address);

    return NextResponse.json({ data: player });
  } catch (error) {
    if (error instanceof WalletLinkConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Wallet auth error:", error);
    return NextResponse.json(
      { error: "Wallet authentication failed" },
      { status: 500 }
    );
  }
}

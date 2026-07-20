import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

  // Verify signature
  if (!message.includes(address) || !message.includes("XOLAT"))
    return NextResponse.json(
      { error: "Invalid sign-in message" },
      { status: 400 }
    );

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

  // Check if user is authenticated (for wallet linking to existing email account)
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;

  try {
    // If user is authenticated, they're linking a wallet to existing account
    if (currentUserId) {
      // Find or create Player by wallet
      let player = await prisma.player.findUnique({
        where: { address: address.toLowerCase() },
      });

      if (!player) {
        // Create new Player with wallet, link to current user
        player = await prisma.player.create({
          data: {
            address: address.toLowerCase(),
            userId: currentUserId,
          },
        });
      } else if (!player.userId) {
        // Wallet-only Player, now linking to email account
        player = await prisma.player.update({
          where: { address: address.toLowerCase() },
          data: { userId: currentUserId },
        });
      } else if (player.userId !== currentUserId) {
        // Wallet already linked to different user
        return NextResponse.json(
          { error: "This wallet is already linked to another account" },
          { status: 409 }
        );
      }
    } else {
      // Wallet-only signup (not currently authenticated)
      await prisma.player.upsert({
        where: { address: address.toLowerCase() },
        update: {},
        create: { address: address.toLowerCase() },
      });

      // Ensure User record exists for NextAuth
      await prisma.user.upsert({
        where: { email: address.toLowerCase() },
        create: {
          email: address.toLowerCase(),
          name:
            address.slice(0, 6) + "..." + address.slice(-4),
        },
        update: {
          name: address.slice(0, 6) + "..." + address.slice(-4),
        },
      });
    }

    // Create/update Account record linking wallet provider to User
    const user = await prisma.user.findUnique({
      where: {
        email: currentUserId
          ? (await prisma.player.findUnique({ where: { address: address.toLowerCase() } }))
              ?.email || address.toLowerCase()
          : address.toLowerCase(),
      },
    });

    if (user) {
      await prisma.account.upsert({
        where: {
          provider_providerAccountId: {
            provider: "wallet",
            providerAccountId: address.toLowerCase(),
          },
        },
        create: {
          userId: user.id,
          type: "credentials",
          provider: "wallet",
          providerAccountId: address.toLowerCase(),
        },
        update: {
          userId: user.id,
        },
      });
    }

    // Get final player state to return
    const player = await prisma.player.findUnique({
      where: { address: address.toLowerCase() },
    });

    return NextResponse.json({ data: player });
  } catch (error) {
    console.error("Wallet auth error:", error);
    return NextResponse.json(
      { error: "Wallet authentication failed" },
      { status: 500 }
    );
  }
}

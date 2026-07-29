import { prisma } from "@/lib/prisma";

export class WalletLinkConflictError extends Error {
  constructor(message = "This wallet is already linked to another account.") {
    super(message);
    this.name = "WalletLinkConflictError";
  }
}

/**
 * Link an EVM wallet address to an authenticated user.
 * Guarantees global uniqueness — throws WalletLinkConflictError if already linked elsewhere.
 */
export async function linkWalletToUser(userId: string, address: string) {
  const walletAddress = address.toLowerCase();

  return prisma.$transaction(async (tx) => {
    // 1. Verify user exists
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: { player: true, wallets: true },
    });

    if (!user) {
      throw new Error("User account not found");
    }

    // 2. Check if wallet is linked to ANY user in Wallet table
    const existingWallet = await tx.wallet.findUnique({
      where: { address: walletAddress },
    });

    if (existingWallet) {
      if (existingWallet.userId === userId) {
        return existingWallet; // Already linked to this user
      }
      throw new WalletLinkConflictError("This wallet is already linked to another account.");
    }

    // 3. Check legacy Player.address uniqueness
    const legacyPlayer = await tx.player.findUnique({
      where: { address: walletAddress },
    });
    if (legacyPlayer && legacyPlayer.userId && legacyPlayer.userId !== userId) {
      throw new WalletLinkConflictError("This wallet is already linked to another account.");
    }

    // 4. Create Wallet record
    const isFirstWallet = user.wallets.length === 0;
    const wallet = await tx.wallet.create({
      data: {
        userId,
        address: walletAddress,
        walletType: "evm",
        network: "celo",
        isPrimary: isFirstWallet,
        verifiedAt: new Date(),
      },
    });

    // 5. If this is primary wallet, sync Player.address for keeper backward compatibility
    if (isFirstWallet && user.player) {
      await tx.player.update({
        where: { id: user.player.id },
        data: { address: walletAddress },
      });
    }

    return wallet;
  });
}

/**
 * Remove a linked wallet from a user account.
 */
export async function removeWalletFromUser(userId: string, address: string) {
  const walletAddress = address.toLowerCase();

  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({
      where: { address: walletAddress },
    });

    if (!wallet || wallet.userId !== userId) {
      throw new Error("Wallet not linked to this account");
    }

    await tx.wallet.delete({
      where: { id: wallet.id },
    });

    // If removed wallet was primary, assign new primary if any remaining
    if (wallet.isPrimary) {
      const nextWallet = await tx.wallet.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });

      const player = await tx.player.findUnique({ where: { userId } });

      if (nextWallet) {
        await tx.wallet.update({
          where: { id: nextWallet.id },
          data: { isPrimary: true },
        });
        if (player) {
          await tx.player.update({
            where: { id: player.id },
            data: { address: nextWallet.address },
          });
        }
      } else if (player) {
        await tx.player.update({
          where: { id: player.id },
          data: { address: null },
        });
      }
    }

    return true;
  });
}

/**
 * Change primary wallet for a user.
 */
export async function setPrimaryWallet(userId: string, address: string) {
  const walletAddress = address.toLowerCase();

  return prisma.$transaction(async (tx) => {
    const targetWallet = await tx.wallet.findUnique({
      where: { address: walletAddress },
    });

    if (!targetWallet || targetWallet.userId !== userId) {
      throw new Error("Wallet not linked to this account");
    }

    // Un-primary all other user wallets
    await tx.wallet.updateMany({
      where: { userId },
      data: { isPrimary: false },
    });

    // Set target wallet as primary
    const updated = await tx.wallet.update({
      where: { id: targetWallet.id },
      data: { isPrimary: true },
    });

    // Sync Player.address for keeper backward compatibility
    const player = await tx.player.findUnique({ where: { userId } });
    if (player) {
      await tx.player.update({
        where: { id: player.id },
        data: { address: walletAddress },
      });
    }

    return updated;
  });
}

/**
 * Get all linked wallets for a user.
 */
export async function getUserWallets(userId: string) {
  return prisma.wallet.findMany({
    where: { userId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
}

/**
 * Look up user by linked wallet address.
 */
export async function getWalletOwner(address: string) {
  const walletAddress = address.toLowerCase();

  const wallet = await prisma.wallet.findUnique({
    where: { address: walletAddress },
    include: {
      user: {
        include: { player: true },
      },
    },
  });

  if (wallet) {
    return wallet.user;
  }

  // Fallback check legacy Player.address
  const legacyPlayer = await prisma.player.findUnique({
    where: { address: walletAddress },
    include: { user: true },
  });

  return legacyPlayer?.user || null;
}
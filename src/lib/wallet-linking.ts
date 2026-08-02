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
        return existingWallet; // Already linked to this user (idempotent reconnect)
      }
      throw new WalletLinkConflictError("This wallet is already linked to another account.");
    }

    // 3. Check if wallet is associated with another user in legacy Player.address
    const existingPlayer = await tx.player.findUnique({
      where: { address: walletAddress },
      include: { user: true },
    });

    if (existingPlayer && existingPlayer.userId !== userId) {
      // If that other user has a verified email or active account, reject
      if (existingPlayer.user && existingPlayer.user.emailVerified) {
        throw new WalletLinkConflictError("This wallet is already linked to another account.");
      }

      // Otherwise, clear legacy address on unverified dummy record so real user can claim it
      await tx.player.update({
        where: { id: existingPlayer.id },
        data: { address: null },
      });
    }

    // Clear any leftover Player.address assignment for this address on other players
    await tx.player.updateMany({
      where: { address: walletAddress, NOT: { userId } },
      data: { address: null },
    });

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
  }, { maxWait: 15000, timeout: 30000 });
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

    // Re-evaluate remaining user wallets
    const remainingWallets = await tx.wallet.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    const player = await tx.player.findUnique({ where: { userId } });

    if (remainingWallets.length > 0) {
      const hasPrimary = remainingWallets.some((w) => w.isPrimary);
      let primaryWallet = remainingWallets.find((w) => w.isPrimary);

      if (!hasPrimary) {
        primaryWallet = await tx.wallet.update({
          where: { id: remainingWallets[0].id },
          data: { isPrimary: true },
        });
      }

      if (player) {
        await tx.player.update({
          where: { id: player.id },
          data: { address: primaryWallet?.address || remainingWallets[0].address },
        });
      }
    } else if (player) {
      await tx.player.update({
        where: { id: player.id },
        data: { address: null },
      });
    }

    return true;
  }, { maxWait: 15000, timeout: 30000 });
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
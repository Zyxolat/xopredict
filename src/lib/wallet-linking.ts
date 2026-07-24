import { Prisma, type Player } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const walletProvider = "wallet";

export class WalletLinkConflictError extends Error {}

function mergeRank(currentRank: string, walletRank: string) {
  const ranks = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];
  return ranks.indexOf(currentRank) > ranks.indexOf(walletRank)
    ? currentRank
    : walletRank;
}

async function movePlayerHistory(
  transaction: Prisma.TransactionClient,
  sourcePlayerId: string,
  walletPlayerId: string
) {
  await transaction.pick.updateMany({
    where: { playerId: sourcePlayerId },
    data: { playerId: walletPlayerId },
  });
  await transaction.cosmeticOwned.updateMany({
    where: { playerId: sourcePlayerId },
    data: { playerId: walletPlayerId },
  });
  await transaction.round.updateMany({
    where: { winnerAddress: sourcePlayerId },
    data: { winnerAddress: walletPlayerId },
  });

  const sourceXp = await transaction.seasonXp.findMany({
    where: { playerId: sourcePlayerId },
  });
  for (const entry of sourceXp) {
    const walletXp = await transaction.seasonXp.findUnique({
      where: {
        playerId_seasonId: {
          playerId: walletPlayerId,
          seasonId: entry.seasonId,
        },
      },
    });

    if (walletXp) {
      await transaction.seasonXp.update({
        where: { id: walletXp.id },
        data: { xp: walletXp.xp + entry.xp },
      });
      await transaction.seasonXp.delete({ where: { id: entry.id } });
    } else {
      await transaction.seasonXp.update({
        where: { id: entry.id },
        data: { playerId: walletPlayerId },
      });
    }
  }

  const sourceReferral = await transaction.referral.findUnique({
    where: { refereeId: sourcePlayerId },
  });
  const walletReferral = await transaction.referral.findUnique({
    where: { refereeId: walletPlayerId },
  });
  if (sourceReferral && walletReferral) {
    throw new WalletLinkConflictError(
      "This account has conflicting referral records and cannot be merged automatically"
    );
  }
  await transaction.referral.updateMany({
    where: { referrerId: sourcePlayerId },
    data: { referrerId: walletPlayerId },
  });
  if (sourceReferral) {
    await transaction.referral.update({
      where: { id: sourceReferral.id },
      data: { refereeId: walletPlayerId },
    });
  }

  const arenas = await transaction.privateArena.findMany({
    where: {
      OR: [
        { creatorId: sourcePlayerId },
        { playerIds: { has: sourcePlayerId } },
      ],
    },
  });
  for (const arena of arenas) {
    await transaction.privateArena.update({
      where: { id: arena.id },
      data: {
        creatorId:
          arena.creatorId === sourcePlayerId
            ? walletPlayerId
            : arena.creatorId,
        playerIds: arena.playerIds
          .map((player) =>
            player === sourcePlayerId ? walletPlayerId : player
          )
          .filter((playerId, index, playerIds) => playerIds.indexOf(playerId) === index),
      },
    });
  }
}

function mergedPlayerData(currentPlayer: Player, walletPlayer: Player) {
  const latestBetIsCurrent = currentPlayer.lastBetDate >= walletPlayer.lastBetDate;
  const latestFreePlay =
    !walletPlayer.lastFreePlay ||
    (currentPlayer.lastFreePlay && currentPlayer.lastFreePlay > walletPlayer.lastFreePlay)
      ? currentPlayer.lastFreePlay
      : walletPlayer.lastFreePlay;
  const latestVipExpiry =
    !walletPlayer.vipExpiresAt ||
    (currentPlayer.vipExpiresAt && currentPlayer.vipExpiresAt > walletPlayer.vipExpiresAt)
      ? currentPlayer.vipExpiresAt
      : walletPlayer.vipExpiresAt;

  return {
    email: currentPlayer.email ?? walletPlayer.email,
    username: currentPlayer.username ?? walletPlayer.username,
    totalWonUsdm: currentPlayer.totalWonUsdm.plus(walletPlayer.totalWonUsdm),
    totalPlayed: currentPlayer.totalPlayed + walletPlayer.totalPlayed,
    dailyBetTotalUsdm: latestBetIsCurrent
      ? currentPlayer.dailyBetTotalUsdm.plus(
          currentPlayer.lastBetDate.getTime() === walletPlayer.lastBetDate.getTime()
            ? walletPlayer.dailyBetTotalUsdm
            : 0
        )
      : walletPlayer.dailyBetTotalUsdm,
    lastBetDate: latestBetIsCurrent
      ? currentPlayer.lastBetDate
      : walletPlayer.lastBetDate,
    rank: mergeRank(currentPlayer.rank, walletPlayer.rank),
    onboarded: currentPlayer.onboarded || walletPlayer.onboarded,
    isBanned: currentPlayer.isBanned || walletPlayer.isBanned,
    streakDays: Math.max(currentPlayer.streakDays, walletPlayer.streakDays),
    lastFreePlay: latestFreePlay,
    vipExpiresAt: latestVipExpiry,
  };
}

export async function linkWalletToUser(userId: string, address: string) {
  const walletAddress = address.toLowerCase();

  return prisma.$transaction(async (transaction) => {
    const [currentPlayer, walletPlayer, walletAccount] = await Promise.all([
      transaction.player.findUnique({ where: { userId } }),
      transaction.player.findUnique({ where: { address: walletAddress } }),
      transaction.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: walletProvider,
            providerAccountId: walletAddress,
          },
        },
      }),
    ]);

    if (!currentPlayer) {
      throw new WalletLinkConflictError("No player profile exists for this account");
    }
    if (walletAccount && walletAccount.userId !== userId) {
      throw new WalletLinkConflictError("This wallet is already linked to another account");
    }
    if (walletPlayer?.userId && walletPlayer.userId !== userId) {
      throw new WalletLinkConflictError("This wallet is already linked to another account");
    }

    if (!walletPlayer) {
      const player = await transaction.player.update({
        where: { id: currentPlayer.id },
        data: { address: walletAddress },
      });
      await transaction.account.upsert({
        where: {
          provider_providerAccountId: {
            provider: walletProvider,
            providerAccountId: walletAddress,
          },
        },
        create: {
          userId,
          type: "credentials",
          provider: walletProvider,
          providerAccountId: walletAddress,
        },
        update: { userId },
      });
      return player;
    }

    if (walletPlayer.id === currentPlayer.id) {
      await transaction.account.upsert({
        where: {
          provider_providerAccountId: {
            provider: walletProvider,
            providerAccountId: walletAddress,
          },
        },
        create: {
          userId,
          type: "credentials",
          provider: walletProvider,
          providerAccountId: walletAddress,
        },
        update: { userId },
      });
      return walletPlayer;
    }

    await movePlayerHistory(transaction, currentPlayer.id, walletPlayer.id);

    await transaction.player.update({
      where: { id: currentPlayer.id },
      data: { userId: null, email: null, username: null },
    });
    const player = await transaction.player.update({
      where: { id: walletPlayer.id },
      data: {
        ...mergedPlayerData(currentPlayer, walletPlayer),
        userId,
      },
    });
    await transaction.player.delete({ where: { id: currentPlayer.id } });
    await transaction.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: walletProvider,
          providerAccountId: walletAddress,
        },
      },
      create: {
        userId,
        type: "credentials",
        provider: walletProvider,
        providerAccountId: walletAddress,
      },
      update: { userId },
    });

    return player;
  }, { maxWait: 10_000, timeout: 20_000 });
}

export async function createOrGetWalletPlayer(address: string) {
  const walletAddress = address.toLowerCase();

  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.upsert({
      where: { email: walletAddress },
      create: {
        email: walletAddress,
        name: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
      },
      update: {
        name: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
      },
    });
    const account = await transaction.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: walletProvider,
          providerAccountId: walletAddress,
        },
      },
    });
    if (account && account.userId !== user.id) {
      throw new WalletLinkConflictError("This wallet is already linked to another account");
    }

    const existingPlayer = await transaction.player.findUnique({
      where: { address: walletAddress },
    });
    if (existingPlayer?.userId && existingPlayer.userId !== user.id) {
      throw new WalletLinkConflictError("This wallet is already linked to another account");
    }
    const player = existingPlayer
      ? await transaction.player.update({
          where: { id: existingPlayer.id },
          data: { userId: user.id },
        })
      : await transaction.player.create({
          data: { address: walletAddress, userId: user.id },
        });

    await transaction.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: walletProvider,
          providerAccountId: walletAddress,
        },
      },
      create: {
        userId: user.id,
        type: "credentials",
        provider: walletProvider,
        providerAccountId: walletAddress,
      },
      update: { userId: user.id },
    });

    return player;
  });
}
import assert from "node:assert/strict";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  linkWalletToUser,
  WalletLinkConflictError,
} from "@/lib/wallet-linking";

const prisma = new PrismaClient();
const runId = Date.now().toString(16);
const walletAddress = `0x${runId.padStart(40, "0")}`;
const conflictingWalletAddress = `0x${(BigInt(`0x${runId}`) + 1n)
  .toString(16)
  .padStart(40, "0")}`;
const googleEmail = `wallet-merge-${runId}@example.test`;
const conflictingEmail = `wallet-conflict-${runId}@example.test`;

async function cleanUp() {
  const players = await prisma.player.findMany({
    where: {
      OR: [
        { email: { in: [googleEmail, conflictingEmail] } },
        { address: { in: [walletAddress, conflictingWalletAddress] } },
      ],
    },
    select: { id: true },
  });
  const playerIds = players.map((player) => player.id);
  await prisma.pick.deleteMany({ where: { playerId: { in: playerIds } } });
  await prisma.seasonXp.deleteMany({ where: { playerId: { in: playerIds } } });
  await prisma.cosmeticOwned.deleteMany({ where: { playerId: { in: playerIds } } });
  await prisma.privateArena.deleteMany({
    where: {
      OR: [
        { creatorId: { in: playerIds } },
        { playerIds: { hasSome: playerIds } },
      ],
    },
  });
  await prisma.player.deleteMany({
    where: {
      OR: [
        { email: { in: [googleEmail, conflictingEmail] } },
        { address: { in: [walletAddress, conflictingWalletAddress] } },
      ],
    },
  });
  await prisma.account.deleteMany({
    where: {
      OR: [
        { providerAccountId: { in: ["google-wallet-merge", walletAddress] } },
        { providerAccountId: conflictingWalletAddress },
      ],
    },
  });
  await prisma.user.deleteMany({ where: { email: { in: [googleEmail, conflictingEmail] } } });
}

async function run() {
  await cleanUp();

  try {
    const googleUser = await prisma.user.create({
      data: {
        email: googleEmail,
        name: "Google Merge Test",
        accounts: {
          create: {
            type: "oauth",
            provider: "google",
            providerAccountId: "google-wallet-merge",
          },
        },
      },
    });
    await prisma.player.create({
      data: {
        userId: googleUser.id,
        email: googleEmail,
        totalWonUsdm: new Prisma.Decimal("2"),
        totalPlayed: 1,
      },
    });
    const walletPlayer = await prisma.player.create({
      data: {
        address: walletAddress,
        totalWonUsdm: new Prisma.Decimal("12.5"),
        totalPlayed: 4,
      },
    });
    const round = await prisma.round.create({
      data: {
        roundId: BigInt(Date.now()),
        type: "solo",
        commitHash: `merge-${runId}`,
      },
    });
    const season = await prisma.season.create({
      data: {
        name: `Wallet merge ${runId}`,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86_400_000),
      },
    });
    await Promise.all([
      prisma.pick.create({
        data: { roundId: round.id, playerId: walletPlayer.id, cardIndex: 0 },
      }),
      prisma.seasonXp.create({
        data: { playerId: walletPlayer.id, seasonId: season.id, xp: 250 },
      }),
      prisma.cosmeticOwned.create({
        data: { playerId: walletPlayer.id, type: "frame", name: `merge-${runId}` },
      }),
      prisma.privateArena.create({
        data: {
          creatorId: walletPlayer.id,
          inviteCode: `merge${runId}`.slice(-16),
          betAmount: new Prisma.Decimal("1"),
          playerIds: [walletPlayer.id],
          maxPlayers: 2,
          expiresAt: new Date(Date.now() + 1_800_000),
        },
      }),
    ]);

    const linkedPlayer = await linkWalletToUser(googleUser.id, walletAddress);
    assert.equal(linkedPlayer.id, walletPlayer.id);
    assert.equal(linkedPlayer.userId, googleUser.id);
    assert.equal(linkedPlayer.email, googleEmail);
    assert.equal(linkedPlayer.totalWonUsdm.toString(), "14.5");
    assert.equal(linkedPlayer.totalPlayed, 5);
    assert.equal(await prisma.player.count({ where: { userId: googleUser.id } }), 1);
    assert.equal(await prisma.pick.count({ where: { playerId: walletPlayer.id } }), 1);
    assert.equal(await prisma.seasonXp.count({ where: { playerId: walletPlayer.id } }), 1);
    assert.equal(await prisma.cosmeticOwned.count({ where: { playerId: walletPlayer.id } }), 1);
    assert.equal(
      await prisma.privateArena.count({ where: { playerIds: { has: walletPlayer.id } } }),
      1
    );
    assert.equal(
      await prisma.account.count({
        where: {
          userId: googleUser.id,
          provider: "wallet",
          providerAccountId: walletAddress,
        },
      }),
      1
    );

    const conflictingUser = await prisma.user.create({
      data: { email: conflictingEmail },
    });
    await prisma.player.create({
      data: { userId: conflictingUser.id, address: conflictingWalletAddress },
    });
    await assert.rejects(
      () => linkWalletToUser(googleUser.id, conflictingWalletAddress),
      WalletLinkConflictError
    );
    const conflictingPlayer = await prisma.player.findUnique({
      where: { address: conflictingWalletAddress },
    });
    assert.equal(conflictingPlayer?.userId, conflictingUser.id);

    console.log("Wallet merge integration test passed");
  } finally {
    await cleanUp();
    await prisma.$disconnect();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
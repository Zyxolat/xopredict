import { prisma } from "@/lib/prisma";

export interface CleanupResult {
  expiredTokensDeleted: number;
  expiredSessionsDeleted: number;
  expiredArenasMarked: number;
  oldJobsCleaned: number;
}

/**
 * Automated system cleanup worker routine.
 * Purges expired verification tokens (nonces), expired NextAuth sessions,
 * updates expired unfilled arenas, and cleans old completed keeper jobs.
 */
export async function runSystemCleanup(retentionDays = 30): Promise<CleanupResult> {
  const now = new Date();
  const retentionCutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);

  let expiredTokensDeleted = 0;
  let expiredSessionsDeleted = 0;
  let expiredArenasMarked = 0;
  let oldJobsCleaned = 0;

  try {
    // 1. Delete expired Verification Tokens (SIWE Nonces)
    if (prisma.verificationToken) {
      const tokenRes = await prisma.verificationToken.deleteMany({
        where: { expires: { lt: now } },
      });
      expiredTokensDeleted = tokenRes.count;
    }

    // 2. Delete expired Sessions
    if (prisma.session) {
      const sessionRes = await prisma.session.deleteMany({
        where: { expires: { lt: now } },
      });
      expiredSessionsDeleted = sessionRes.count;
    }

    // 3. Mark expired unfilled Arenas
    if (prisma.arena) {
      const arenaRes = await prisma.arena.updateMany({
        where: {
          status: "OPEN",
          expiresAt: { lt: now },
          currentPlayers: { lt: 2 },
        },
        data: {
          status: "EXPIRED",
        },
      });
      expiredArenasMarked = arenaRes.count;
    }

    // 4. Clean old completed KeeperJobs past retention window
    if (prisma.keeperJob) {
      const jobRes = await prisma.keeperJob.deleteMany({
        where: {
          status: "COMPLETED",
          updatedAt: { lt: retentionCutoff },
        },
      });
      oldJobsCleaned = jobRes.count;
    }
  } catch (err) {
    console.error("[System Cleanup Worker] Error during system cleanup:", err);
  }

  console.log(
    `[System Cleanup Worker] Complete: ${expiredTokensDeleted} nonces, ${expiredSessionsDeleted} sessions, ${expiredArenasMarked} arenas, ${oldJobsCleaned} old jobs cleaned.`
  );

  return {
    expiredTokensDeleted,
    expiredSessionsDeleted,
    expiredArenasMarked,
    oldJobsCleaned,
  };
}

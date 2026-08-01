import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { linkWalletToUser, getWalletOwner, WalletLinkConflictError } from "../src/lib/wallet-linking";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

async function withRetry<T>(fn: () => Promise<T>, retries = 5, delay = 2000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      if (i === retries - 1) throw e;
      console.log(`Database connection attempt ${i + 1} failed. Retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Failed after retries");
}

async function main() {
  console.log("=== STARTING WALLET LINKING SYSTEM VERIFICATION ===");

  // Initial cleanup of test wallets
  await withRetry(() => prisma.wallet.deleteMany({ where: { address: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8" } }));

  // 1. Inspect Wallet table before
  const walletsBefore = await withRetry(() => prisma.wallet.findMany());
  console.log("\n[SQL/PRISMA EVIDENCE] Wallet table before test:");
  console.log(JSON.stringify(walletsBefore, null, 2));

  // 2. Create test user 1 (Account A)
  const testUserA = await prisma.user.create({
    data: {
      email: `test.user.a.${Date.now()}@example.com`,
      username: `user_a_${Date.now()}`,
      displayName: "User A",
      emailVerified: new Date(),
    },
  });
  console.log(`\n[STEP 1] Created Test Account A: ID = ${testUserA.id}, Email = ${testUserA.email}`);

  // 3. Create test user 2 (Account B)
  const testUserB = await prisma.user.create({
    data: {
      email: `test.user.b.${Date.now()}@example.com`,
      username: `user_b_${Date.now()}`,
      displayName: "User B",
      emailVerified: new Date(),
    },
  });
  console.log(`[STEP 2] Created Test Account B: ID = ${testUserB.id}, Email = ${testUserB.email}`);

  const testWalletAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const testWalletAddressLower = testWalletAddress.toLowerCase();

  // 4. Link wallet to Account A (with mixed case input)
  console.log(`\n[STEP 3] Linking wallet ${testWalletAddress} to Account A (${testUserA.id})...`);
  const linkedWalletA = await linkWalletToUser(testUserA.id, testWalletAddress);
  console.log("Result:", JSON.stringify(linkedWalletA, null, 2));

  if (linkedWalletA.address !== testWalletAddressLower) {
    throw new Error(`Normalization failed! Expected ${testWalletAddressLower}, got ${linkedWalletA.address}`);
  }
  console.log("✓ Success: Wallet address normalized and linked to Account A.");

  // 5. Re-link SAME wallet to Account A (Idempotent test)
  console.log(`\n[STEP 4] Re-linking SAME wallet ${testWalletAddress} to Account A (${testUserA.id}) [Idempotency Check]...`);
  const relinkResult = await linkWalletToUser(testUserA.id, testWalletAddress);
  console.log("Result:", JSON.stringify(relinkResult, null, 2));
  console.log("✓ Success: Same user linking same wallet returns existing link cleanly without throwing conflict error.");

  // 6. Attempt to link SAME wallet to Account B (Conflict test)
  console.log(`\n[STEP 5] Attempting to link SAME wallet ${testWalletAddress} to Account B (${testUserB.id}) [Conflict Check]...`);
  try {
    await linkWalletToUser(testUserB.id, testWalletAddress);
    throw new Error("FAIL: Conflict check failed! Expected WalletLinkConflictError but succeeded.");
  } catch (err: any) {
    if (err instanceof WalletLinkConflictError) {
      console.log(`✓ Success: Correctly rejected Account B with error message: "${err.message}"`);
    } else {
      console.error("Unexpected error type:", err);
      throw err;
    }
  }

  // 7. Verify lookup query
  console.log(`\n[STEP 6] Verifying getWalletOwner for address ${testWalletAddress}...`);
  const owner = await withRetry(() => getWalletOwner(testWalletAddress));
  console.log("Owner found:", owner?.email);
  if (owner?.id !== testUserA.id) {
    throw new Error(`Owner mismatch! Expected ${testUserA.id}, got ${owner?.id}`);
  }
  console.log("✓ Success: getWalletOwner accurately identifies Account A as owner.");

  // 8. Inspect Wallet table after
  const walletsAfter = await prisma.wallet.findMany({
    where: { userId: { in: [testUserA.id, testUserB.id] } },
  });
  console.log("\n[SQL/PRISMA EVIDENCE] Wallet table after test:");
  console.log(JSON.stringify(walletsAfter, null, 2));

  // Cleanup test users
  await prisma.wallet.deleteMany({ where: { userId: { in: [testUserA.id, testUserB.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [testUserA.id, testUserB.id] } } });
  console.log("\n[CLEANUP] Deleted temporary test users & wallets.");

  console.log("\n=== ALL WALLET LINKING VERIFICATION CHECKS PASSED SUCCESSFULLY ===");
}

main()
  .catch((e) => {
    console.error("Verification failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

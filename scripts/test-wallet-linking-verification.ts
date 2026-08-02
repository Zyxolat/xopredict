import { PrismaClient } from "@prisma/client";
import { linkWalletToUser, removeWalletFromUser, WalletLinkConflictError } from "../src/lib/wallet-linking";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

async function runVerification() {
  console.log("==========================================================");
  console.log("STARTING WALLET LINKING & AUTHENTICATION VERIFICATION");
  console.log("==========================================================");

  // 1. Initial State
  console.log("\n--- [STEP 1] INITIAL DATABASE STATE ---");
  const initialWallets = await prisma.wallet.findMany({ include: { user: true } });
  console.log(`Current Wallets Count: ${initialWallets.length}`);
  console.log("Wallets:", JSON.stringify(initialWallets, null, 2));

  const initialPlayers = await prisma.player.findMany({
    where: { address: { not: null } },
    select: { id: true, userId: true, address: true },
  });
  console.log("Players with linked addresses:", JSON.stringify(initialPlayers, null, 2));

  const testWalletAddress = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

  // 2. Clean up test users if they exist from prior runs
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          "account_a_verification@example.com",
          "account_b_verification@example.com",
        ],
      },
    },
  });

  // 3. Create User A
  console.log("\n--- [STEP 2] CREATING BRAND NEW ACCOUNT A ---");
  const userA = await prisma.user.create({
    data: {
      email: "account_a_verification@example.com",
      username: "account_a_user",
      displayName: "Account A User",
      emailVerified: new Date(),
      player: {
        create: {},
      },
    },
    include: { player: true },
  });
  console.log("User A created:", { id: userA.id, email: userA.email });

  // 4. Link Wallet to User A
  console.log("\n--- [STEP 3] LINKING WALLET TO USER A ---");
  const walletA = await linkWalletToUser(userA.id, testWalletAddress);
  console.log("Wallet successfully linked to User A:", {
    id: walletA.id,
    address: walletA.address,
    userId: walletA.userId,
    isPrimary: walletA.isPrimary,
  });

  const playerA = await prisma.player.findUnique({ where: { userId: userA.id } });
  console.log("User A Player.address synced:", playerA?.address);

  // 5. Test Same-User Reconnect (Idempotency)
  console.log("\n--- [STEP 4] RE-LINKING SAME WALLET TO USER A (IDEMPOTENCY TEST) ---");
  const walletARelink = await linkWalletToUser(userA.id, testWalletAddress);
  console.log("Re-link succeeded cleanly (same user):", {
    id: walletARelink.id,
    address: walletARelink.address,
  });

  // 6. Create User B
  console.log("\n--- [STEP 5] CREATING BRAND NEW ACCOUNT B ---");
  const userB = await prisma.user.create({
    data: {
      email: "account_b_verification@example.com",
      username: "account_b_user",
      displayName: "Account B User",
      emailVerified: new Date(),
      player: {
        create: {},
      },
    },
    include: { player: true },
  });
  console.log("User B created:", { id: userB.id, email: userB.email });

  // 7. Attempt to link SAME wallet to User B (Must fail with conflict)
  console.log("\n--- [STEP 6] ATTEMPTING TO LINK SAME WALLET TO USER B (MUST REJECT) ---");
  let rejectedError = null;
  try {
    await linkWalletToUser(userB.id, testWalletAddress);
  } catch (err: any) {
    rejectedError = err;
  }

  if (rejectedError instanceof WalletLinkConflictError) {
    console.log("✅ SUCCESS: User B was correctly rejected with message:");
    console.log(`   "${rejectedError.message}"`);
  } else {
    console.error("❌ ERROR: Expected WalletLinkConflictError, but got:", rejectedError);
    throw new Error("Verification failed: Duplicate wallet linking was not properly rejected");
  }

  // 8. Unlink wallet from User A
  console.log("\n--- [STEP 7] UNLINKING WALLET FROM USER A ---");
  await removeWalletFromUser(userA.id, testWalletAddress);
  console.log("Wallet unlinked from User A.");

  const playerAAfterUnlink = await prisma.player.findUnique({ where: { userId: userA.id } });
  console.log("User A Player.address after unlink:", playerAAfterUnlink?.address);

  // 9. User B re-attempts linking after User A unlinked (Must succeed)
  console.log("\n--- [STEP 8] LINKING WALLET TO USER B AFTER UNLINK (MUST SUCCEED) ---");
  const walletB = await linkWalletToUser(userB.id, testWalletAddress);
  console.log("Wallet successfully linked to User B:", {
    id: walletB.id,
    address: walletB.address,
    userId: walletB.userId,
    isPrimary: walletB.isPrimary,
  });

  // 10. Final State
  console.log("\n--- [STEP 9] FINAL DATABASE STATE ---");
  const finalWallets = await prisma.wallet.findMany({ include: { user: true } });
  console.log("Final Wallets Table:", JSON.stringify(finalWallets, null, 2));

  const finalPlayers = await prisma.player.findMany({
    where: { address: { not: null } },
    select: { id: true, userId: true, address: true },
  });
  console.log("Final Players with linked addresses:", JSON.stringify(finalPlayers, null, 2));

  console.log("\n==========================================================");
  console.log("ALL VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉");
  console.log("==========================================================");
}

runVerification()
  .catch((err) => {
    console.error("\n❌ VERIFICATION TEST FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

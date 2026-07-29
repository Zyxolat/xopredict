import { ethers } from "ethers";
import { prisma } from "../src/lib/prisma";
import { authOptions } from "../src/lib/auth";

async function testE2EAuth() {
  console.log("================================================================================");
  console.log("   STEP 4: END-TO-END WALLET AUTH & SESSION VERIFICATION                        ");
  console.log("================================================================================\n");

  // 1. Create real test wallet signature
  const wallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
  const address = wallet.address;
  const message = `Sign in to XOLAT\nWallet: ${address}\nTimestamp: ${Date.now()}\nNonce: test-nonce-123`;
  const signature = await wallet.signMessage(message);

  console.log("Test Wallet Address:", address);
  console.log("Generated Signature:", signature.slice(0, 20) + "...");

  const walletProvider = authOptions.providers.find((p: any) => p.id === "credentials");
  if (!walletProvider) throw new Error("Credentials provider not found in authOptions");

  console.log("Wallet Provider Keys:", Object.keys(walletProvider));
  const authorizeFn = (walletProvider as any).options?.authorize || (walletProvider as any).authorize;
  console.log("Invoking NextAuth credentials authorizeFn()...");
  console.log("authorizeFn implementation:\n", authorizeFn.toString());
  const user = await authorizeFn({ address, message, signature });
  console.log("Authorize Result User:", user);

  if (!user || !user.id || !user.address) {
    throw new Error("❌ NextAuth authorize() failed to return user object!");
  }

  // 3. Verify Database Records
  console.log("\nChecking PostgreSQL database records:");
  const dbUser = await prisma.user.findUnique({ where: { email: address.toLowerCase() } });
  const dbPlayer = await prisma.player.findUnique({ where: { address: address.toLowerCase() } });
  const dbAccount = await prisma.account.findFirst({ where: { providerAccountId: address.toLowerCase() } });

  console.log("  - DB User Record:    ", dbUser ? `EXISTS (id: ${dbUser.id}, email: ${dbUser.email})` : "MISSING ❌");
  console.log("  - DB Player Record:  ", dbPlayer ? `EXISTS (id: ${dbPlayer.id}, address: ${dbPlayer.address})` : "MISSING ❌");
  console.log("  - DB Account Record: ", dbAccount ? `EXISTS (id: ${dbAccount.id}, provider: ${dbAccount.provider})` : "MISSING ❌");

  if (!dbUser || !dbPlayer || !dbAccount) {
    throw new Error("❌ Database records incomplete!");
  }

  // 4. Test NextAuth JWT & Session callbacks
  console.log("\nTesting NextAuth Session generation...");
  const token = await (authOptions.callbacks!.jwt as any)({ token: {}, user, account: { provider: "wallet", type: "credentials", providerAccountId: address.toLowerCase() } });
  console.log("  - JWT Token:", token);

  const session = await (authOptions.callbacks!.session as any)({
    session: { user: {}, expires: new Date(Date.now() + 86400000).toISOString() },
    token
  });
  console.log("  - Generated NextAuth Session:", session);

  const sessionUser = session?.user as any;
  if (!sessionUser?.id || sessionUser?.address?.toLowerCase() !== address.toLowerCase()) {
    throw new Error("❌ Session payload invalid!");
  }

  console.log("\n================================================================================");
  console.log("   ✅ STEP 4 VERIFICATION PASSED SUCCESSFULLY!                                   ");
  console.log("================================================================================\n");
  await prisma.$disconnect();
}

testE2EAuth().catch((err) => {
  console.error("\n❌ E2E VERIFICATION FAILED:", err);
  process.exit(1);
});

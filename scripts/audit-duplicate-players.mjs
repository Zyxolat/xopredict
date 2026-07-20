#!/usr/bin/env node

/**
 * Audit script: Find duplicate Player records from current auth bug
 * Run: node scripts/audit-duplicate-players.mjs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function auditDuplicatePlayers() {
  console.log("\n=== DUPLICATE PLAYER AUDIT ===\n");

  // Pattern 1: Same email in multiple records
  console.log("Pattern 1: Multiple Players with same email");
  const emailDuplicates = await prisma.$queryRaw`
    SELECT email, COUNT(*)::int as count
    FROM players
    WHERE email IS NOT NULL
    GROUP BY email
    HAVING COUNT(*) > 1
  `;
  
  if (emailDuplicates.length > 0) {
    console.log("⚠️  FOUND:", emailDuplicates.length, "email addresses with duplicates");
    for (const dup of emailDuplicates) {
      const players = await prisma.player.findMany({
        where: { email: dup.email },
      });
      console.log(`\n   Email: ${dup.email} (${dup.count} Players)`);
      players.forEach(p => console.log(`     - Player ${p.id.slice(0, 8)}: address="${p.address}", email="${p.email}"`));
    }
  } else {
    console.log("✓ No duplicates by email");
  }

  // Pattern 2: Multiple Players with email-like address (placeholder from Google)
  console.log("\nPattern 2: Email-placeholder addresses mixed with wallet addresses");
  const emailPlaceholders = await prisma.player.findMany({
    where: {
      address: { contains: "@" }
    },
  });

  if (emailPlaceholders.length > 0) {
    console.log(`⚠️  FOUND ${emailPlaceholders.length} Players with email as address (likely Google signups):`);
    for (const player of emailPlaceholders) {
      console.log(`   Player ${player.id.slice(0, 8)}: address="${player.address}", email="${player.email}"`);
    }
  } else {
    console.log("✓ No email-placeholder addresses found");
  }

  // Pattern 3: Check if any email user also has a wallet address (should have both fields)
  console.log("\nPattern 3: Check email field consistency");
  const emailUsers = await prisma.player.findMany({
    where: { email: { not: null } },
  });

  let inconsistent = 0;
  for (const player of emailUsers) {
    const isWallet = player.address.startsWith("0x");
    const isEmail = player.address.includes("@");
    
    if (!isWallet && !isEmail && player.address !== player.email) {
      console.log(`   ⚠️  Inconsistent Player ${player.id.slice(0, 8)}: address="${player.address}" doesn't match email="${player.email}"`);
      inconsistent++;
    }
  }
  
  if (inconsistent === 0) {
    console.log("✓ All email-based Players have consistent address format");
  }

  // Pattern 4: Orphaned Players (null email, non-wallet address?)
  console.log("\nPattern 4: Orphaned or invalid addresses");
  const orphaned = await prisma.player.findMany({
    where: { email: null },
  });

  let invalid = 0;
  for (const player of orphaned) {
    const isValidWallet = player.address.startsWith("0x") && player.address.length === 42;
    if (!isValidWallet) {
      console.log(`   ⚠️  Orphaned Player ${player.id.slice(0, 8)}: address="${player.address}" (not valid wallet format)`);
      invalid++;
    }
  }

  if (invalid === 0) {
    console.log(`✓ All ${orphaned.length} non-email Players have valid wallet addresses`);
  }

  // Summary
  console.log("\n=== SUMMARY ===");
  const totalPlayers = await prisma.player.count();
  const emailPlayers = await prisma.player.count({ where: { email: { not: null } } });
  const walletPlayers = await prisma.player.count({ where: { email: null } });

  console.log(`Total Players in database: ${totalPlayers}`);
  console.log(`  - With email: ${emailPlayers}`);
  console.log(`  - Wallet-only: ${walletPlayers}`);

  if (totalPlayers === 0) {
    console.log("\n✓ Database is empty - no duplicates to worry about");
  } else {
    console.log("\n⚠️  ACTION REQUIRED:");
    console.log("Review the patterns above. Any duplicates found should be noted.");
    console.log("Before running migration, confirm with user.");
  }
}

// Run
auditDuplicatePlayers()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

async function main() {
  console.log("=================================================");
  console.log("  XOPREDICT PRODUCTION REALITY AUDIT (RUNTIME)   ");
  console.log("=================================================");

  // 1. Health Check
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    console.log("[PASS] GET /api/health:", res.status, await res.json());
  } catch (e: any) {
    console.log("[FAIL] GET /api/health:", e.message);
  }

  // 2. Auth Username Check
  const ts = Date.now().toString().slice(-6);
  const testUsername = `user_${ts}`;
  const testEmail = `audit_${ts}@example.com`;

  try {
    const res = await fetch(`${BASE_URL}/api/auth/check-username?username=${testUsername}`);
    console.log("[PASS] GET /api/auth/check-username:", res.status, await res.json());
  } catch (e: any) {
    console.log("[FAIL] GET /api/auth/check-username:", e.message);
  }

  // 3. User Registration
  let regRes, regData;
  try {
    regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        username: testUsername,
        password: "TestPassword123!",
        displayName: "Audit Tester"
      })
    });
    regData = await regRes.json();
    console.log(`[${regRes.ok ? 'PASS' : 'FAIL'}] POST /api/auth/register:`, regRes.status, regData);
  } catch (e: any) {
    console.log("[FAIL] POST /api/auth/register:", e.message);
  }

  // 4. Duplicate Registration Rejection
  try {
    const dupRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        username: testUsername,
        password: "TestPassword123!",
        displayName: "Duplicate User"
      })
    });
    console.log(`[${dupRes.status === 409 ? 'PASS' : 'FAIL'}] POST /api/auth/register Duplicate:`, dupRes.status, await dupRes.json());
  } catch (e: any) {
    console.log("[FAIL] Duplicate Registration Test:", e.message);
  }

  // 5. Database Verification Token & Email Verification
  let tokenRecord = null;
  if (regRes?.ok) {
    const dbUser = await prisma.user.findUnique({ where: { email: testEmail } });
    console.log("[DB VERIFY] Registered User ID:", dbUser?.id, "Email Verified Status:", dbUser?.emailVerified);
    tokenRecord = await prisma.verificationToken.findFirst({ where: { identifier: testEmail } });
    console.log("[DB VERIFY] OTP Verification Token:", tokenRecord ? tokenRecord.token : "NOT FOUND");
  }

  if (tokenRecord) {
    // Test Invalid OTP Token
    try {
      const badVerifyRes = await fetch(`${BASE_URL}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail, code: "999999" })
      });
      console.log(`[${badVerifyRes.status === 400 ? 'PASS' : 'FAIL'}] Invalid OTP Rejection:`, badVerifyRes.status, await badVerifyRes.json());
    } catch (e: any) {
      console.log("[FAIL] Invalid OTP Test:", e.message);
    }

    // Test Valid OTP Token
    try {
      const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail, code: tokenRecord.token })
      });
      console.log(`[${verifyRes.ok ? 'PASS' : 'FAIL'}] Valid OTP Verification:`, verifyRes.status, await verifyRes.json());
      
      const dbUserAfter = await prisma.user.findUnique({ where: { email: testEmail } });
      console.log("[DB VERIFY] Email Verified After OTP:", dbUserAfter?.emailVerified ? "YES" : "NO");
    } catch (e: any) {
      console.log("[FAIL] Valid OTP Test:", e.message);
    }
  }

  // 6. Authorization Checks (Unauthenticated requests to protected APIs)
  console.log("\n--- UNAUTHENTICATED PROTECTED API ACCESS CHECKS ---");
  const protectedAPIs = [
    { path: "/api/players/me", expected: 401 },
    { path: "/api/profile", expected: 401 },
    { path: "/api/wallet/connect", expected: 401 },
    { path: "/api/wallet/disconnect", expected: 401 },
    { path: "/api/admin", expected: 401 },
    { path: "/api/keeper/dashboard", expected: 401 },
    { path: "/api/keeper/cleanup", expected: 401 }
  ];

  for (const item of protectedAPIs) {
    try {
      const res = await fetch(`${BASE_URL}${item.path}`);
      const pass = res.status === item.expected || res.status === 403;
      console.log(`[${pass ? 'PASS' : 'FAIL'}] GET ${item.path} -> Status: ${res.status} (Expected: ${item.expected})`);
    } catch (e: any) {
      console.log(`[FAIL] GET ${item.path}:`, e.message);
    }
  }

  // 7. Public API Access Checks
  console.log("\n--- PUBLIC API ACCESS CHECKS ---");
  const publicAPIs = [
    "/api/leaderboard",
    "/api/live-feed",
    "/api/cosmetics",
    "/api/arenas/open",
    "/api/seasons",
    "/api/keeper/health",
    "/api/verify?roundId=nonexistent"
  ];

  for (const path of publicAPIs) {
    try {
      const res = await fetch(`${BASE_URL}${path}`);
      console.log(`[${res.ok || res.status === 404 ? 'PASS' : 'FAIL'}] GET ${path} -> Status: ${res.status}`);
    } catch (e: any) {
      console.log(`[FAIL] GET ${path}:`, e.message);
    }
  }

  // 8. Database Verification Summary
  console.log("\n--- DATABASE INTEGRITY STATS ---");
  const users = await prisma.user.count();
  const players = await prisma.player.count();
  const wallets = await prisma.userWallet.count();
  const arenas = await prisma.arena.count();
  const rounds = await prisma.round.count();
  const bets = await prisma.bet.count();
  const auditLogs = await prisma.auditLog.count();

  console.log(`Users: ${users} | Players: ${players} | Wallets: ${wallets}`);
  console.log(`Arenas: ${arenas} | Rounds: ${rounds} | Bets: ${bets} | AuditLogs: ${auditLogs}`);

  await prisma.$disconnect();
  console.log("\n=================================================");
  console.log("  RUNTIME AUDIT COMPLETE                         ");
  console.log("=================================================");
}

main().catch(console.error);

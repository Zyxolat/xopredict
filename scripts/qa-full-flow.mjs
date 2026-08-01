import { PrismaClient } from "@prisma/client";
import { createHash, randomInt } from "crypto";

const prisma = new PrismaClient();

// === QA: Generate a known OTP, inject it into DB, return it ===
async function injectKnownOTP(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) { console.error("USER NOT FOUND:", email); return null; }

  // Generate known OTP
  const otp = String(randomInt(100000, 999999));
  const otpHash = createHash("sha256").update(otp).digest("hex");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // Delete old OTPs for this user
  await prisma.emailVerification.deleteMany({ where: { userId: user.id } });

  // Insert fresh OTP
  const record = await prisma.emailVerification.create({
    data: { userId: user.id, otpHash, expiresAt }
  });

  console.log(JSON.stringify({
    step: "OTP_INJECTED",
    userId: user.id,
    email: user.email,
    otp_PLAINTEXT_QA_ONLY: otp,
    otpHash_first16: otpHash.slice(0,16) + "...[SHA256]",
    expiresAt: expiresAt.toISOString(),
    recordId: record.id,
    attempts: record.attempts,
  }, null, 2));

  return { user, otp, record };
}

async function main() {
  const email = "chukwumahenry01@gmail.com";
  const result = await injectKnownOTP(email);
  if (!result) process.exit(1);

  console.log("\n=== DB STATE AFTER OTP INJECTION ===");
  const row = await prisma.emailVerification.findFirst({
    where: { userId: result.user.id },
    orderBy: { createdAt: "desc" }
  });
  console.log(JSON.stringify({
    id: row.id,
    userId: row.userId,
    otpHashLength: row.otpHash.length,
    isValidSHA256: /^[a-f0-9]{64}$/.test(row.otpHash),
    expiresAt: row.expiresAt,
    attempts: row.attempts,
    usedAt: row.usedAt,
    createdAt: row.createdAt,
  }, null, 2));
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); }).finally(() => prisma.$disconnect());

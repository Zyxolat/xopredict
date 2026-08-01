import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const email = "chukwumahenry01@gmail.com";
async function main() {
  console.log("=== DB: user row ===");
  const user = await prisma.user.findUnique({ where: { email }, select: { id:true, email:true, username:true, emailVerified:true, createdAt:true, passwordHash:true, status:true, role:true } });
  if (!user) { console.log("NO USER FOUND"); return; }
  console.log({ id:user.id, email:user.email, username:user.username, emailVerified:user.emailVerified, createdAt:user.createdAt, hasPasswordHash:!!user.passwordHash, passwordHashAlgo:user.passwordHash?.startsWith("$2")?"bcrypt":"unknown", status:user.status, role:user.role });
  console.log("\n=== DB: email_verification row (latest) ===");
  const otp = await prisma.emailVerification.findFirst({ where:{userId:user.id}, orderBy:{createdAt:"desc"} });
  if (!otp) { console.log("NO OTP ROW"); return; }
  const expiresInSec = Math.round((otp.expiresAt.getTime() - Date.now()) / 1000);
  console.log({ id:otp.id, userId:otp.userId, otpHash_first16:otp.otpHash.slice(0,16)+"...[SHA256-64chars]", otpHashLength:otp.otpHash.length, isValidSHA256:/^[a-f0-9]{64}$/.test(otp.otpHash), expiresAt:otp.expiresAt, expiresInSeconds:expiresInSec, attempts:otp.attempts, usedAt:otp.usedAt, createdAt:otp.createdAt });
  console.log("\n=== DB: player row ===");
  const player = await prisma.player.findFirst({ where:{userId:user.id}, select:{id:true,userId:true,createdAt:true,onboarded:true} });
  console.log(player ?? "NO PLAYER ROW");
}
main().catch(e=>{ console.error("ERROR:",e); process.exit(1); }).finally(()=>prisma.$disconnect());

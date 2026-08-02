import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyOTP, MAX_OTP_ATTEMPTS } from "@/lib/otp";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { sendPasswordChangedNotification } from "@/lib/email";

export const dynamic = "force-dynamic";

const resetSchema = z.object({
  email: z.string().email().transform((val) => val.toLowerCase().trim()),
  otp: z.string().length(6, "OTP must be 6 digits"),
  newPassword: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { email, otp, newPassword } = parsed.data;

    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Find active password reset record
    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!resetRecord) {
      return NextResponse.json(
        { error: "No active password reset request found. Please request a new code." },
        { status: 400 }
      );
    }

    if (resetRecord.attempts >= MAX_OTP_ATTEMPTS) {
      return NextResponse.json(
        { error: "Maximum attempts exceeded. Please request a new reset code." },
        { status: 429 }
      );
    }

    if (new Date() > resetRecord.expiresAt) {
      return NextResponse.json(
        { error: "Reset code has expired. Please request a new code." },
        { status: 400 }
      );
    }

    const isValid = verifyOTP(otp, resetRecord.otpHash);

    if (!isValid) {
      await prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { attempts: { increment: 1 } },
      });

      const remaining = MAX_OTP_ATTEMPTS - (resetRecord.attempts + 1);
      return NextResponse.json(
        { error: `Invalid reset code. ${remaining} attempt(s) remaining.` },
        { status: 400 }
      );
    }

    // Valid OTP — update password, mark used
    const newPasswordHash = await hashPassword(newPassword);
    const now = new Date();

    await prisma.$transaction([
      prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { usedAt: now },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash, passwordChangedAt: now },
      }),
      // Invalidate existing sessions (Session rows; JWTs are actually
      // invalidated via the passwordChangedAt stamp checked in requireSession)
      prisma.session.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    try {
      await sendPasswordChangedNotification(user.email!);
    } catch (emailErr) {
      console.error("[Reset Password API] Email notification error:", emailErr);
    }

    return NextResponse.json({
      message: "Password reset successful. You may now sign in with your new password.",
    });
  } catch (error: unknown) {
    console.error("[Reset Password API] Internal error:", error);
    return NextResponse.json(
      { error: "An error occurred while resetting password" },
      { status: 500 }
    );
  }
}

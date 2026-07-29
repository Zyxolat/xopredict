import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyOTP, MAX_OTP_ATTEMPTS, generateOTP, hashOTP, OTP_EXPIRY_MS } from "@/lib/otp";
import { sendVerificationOTP } from "@/lib/email";

export const dynamic = "force-dynamic";

const verifySchema = z.object({
  email: z.string().email().transform((val) => val.toLowerCase().trim()),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { email, otp } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { message: "Email is already verified" },
        { status: 200 }
      );
    }

    // Fetch latest active email verification record
    const verificationRecord = await prisma.emailVerification.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verificationRecord) {
      return NextResponse.json(
        { error: "No pending verification code found. Please request a new code." },
        { status: 400 }
      );
    }

    if (verificationRecord.attempts >= MAX_OTP_ATTEMPTS) {
      return NextResponse.json(
        { error: "Maximum attempts exceeded. Please request a new verification code." },
        { status: 429 }
      );
    }

    if (new Date() > verificationRecord.expiresAt) {
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new code." },
        { status: 400 }
      );
    }

    const isValid = verifyOTP(otp, verificationRecord.otpHash);

    if (!isValid) {
      // Increment attempt counter
      await prisma.emailVerification.update({
        where: { id: verificationRecord.id },
        data: { attempts: { increment: 1 } },
      });

      const remaining = MAX_OTP_ATTEMPTS - (verificationRecord.attempts + 1);
      return NextResponse.json(
        { error: `Invalid verification code. ${remaining} attempt(s) remaining.` },
        { status: 400 }
      );
    }

    // Valid OTP — update verification record and user
    const now = new Date();
    await prisma.$transaction([
      prisma.emailVerification.update({
        where: { id: verificationRecord.id },
        data: { usedAt: now },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: now },
      }),
    ]);

    return NextResponse.json({
      message: "Email verified successfully. You may now sign in.",
    });
  } catch (error: unknown) {
    console.error("[Verify Email API] Internal error:", error);
    return NextResponse.json(
      { error: "An error occurred while verifying email" },
      { status: 500 }
    );
  }
}

// Resend OTP endpoint (PUT)
export async function PUT(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { message: "Email is already verified" },
        { status: 200 }
      );
    }

    // Rate limit: check if a code was created within the last 60 seconds
    const recent = await prisma.emailVerification.findFirst({
      where: {
        userId: user.id,
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
    });

    if (recent) {
      return NextResponse.json(
        { error: "Please wait 60 seconds before requesting another code." },
        { status: 429 }
      );
    }

    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        otpHash,
        expiresAt,
      },
    });

    await sendVerificationOTP(user.email!, otp);

    return NextResponse.json({
      message: "Verification code sent to your email.",
    });
  } catch (error: unknown) {
    console.error("[Resend OTP API] Internal error:", error);
    return NextResponse.json(
      { error: "Failed to resend verification code" },
      { status: 500 }
    );
  }
}

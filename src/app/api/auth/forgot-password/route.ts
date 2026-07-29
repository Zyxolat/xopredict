import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateOTP, hashOTP, OTP_EXPIRY_MS } from "@/lib/otp";
import { sendPasswordResetOTP } from "@/lib/email";

export const dynamic = "force-dynamic";

const forgotSchema = z.object({
  email: z.string().email().transform((val) => val.toLowerCase().trim()),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = forgotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success response to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: "If an account with that email exists, a password reset code has been sent.",
      });
    }

    // Rate limit: check if a reset code was created within last 60 seconds
    const recent = await prisma.passwordReset.findFirst({
      where: {
        userId: user.id,
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
    });

    if (recent) {
      return NextResponse.json({
        message: "If an account with that email exists, a password reset code has been sent.",
      });
    }

    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        otpHash,
        expiresAt,
      },
    });

    try {
      await sendPasswordResetOTP(user.email!, otp);
    } catch (emailErr) {
      console.error("[Forgot Password API] Email send error:", emailErr);
    }

    return NextResponse.json({
      message: "If an account with that email exists, a password reset code has been sent.",
    });
  } catch (error: unknown) {
    console.error("[Forgot Password API] Internal error:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}

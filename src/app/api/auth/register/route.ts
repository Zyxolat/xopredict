import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { generateOTP, hashOTP, OTP_EXPIRY_MS } from "@/lib/otp";
import { sendVerificationOTP } from "@/lib/email";

export const dynamic = "force-dynamic";

const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

const registerSchema = z.object({
  email: z.string().email("Invalid email address").transform((val) => val.toLowerCase().trim()),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(usernameRegex, "Username can only contain letters, numbers, and underscores"),
  displayName: z.string().min(1, "Display name is required").max(50).optional(),
  password: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid registration data" },
        { status: 400 }
      );
    }

    const { email, username, displayName, password } = parsed.data;

    // Validate password strength
    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    // Check email uniqueness
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Check username case-insensitive uniqueness
    const existingUsername = await prisma.user.findFirst({
      where: {
        username: { equals: username, mode: "insensitive" },
      },
    });
    if (existingUsername) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user and player in transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          username,
          displayName: displayName || username,
          passwordHash,
          emailVerified: null,
          role: "USER",
          status: "ACTIVE",
        },
      });

      await tx.player.create({
        data: {
          userId: newUser.id,
        },
      });

      return newUser;
    });

    // Generate and store OTP
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

    // Send verification email via Resend
    try {
      await sendVerificationOTP(user.email!, otp);
    } catch (emailErr) {
      console.error("[Register API] Error sending verification email:", emailErr);
      // We don't fail registration if email send fails in dev, but log it
    }

    return NextResponse.json(
      {
        message: "Account created successfully. Please check your email for the verification code.",
        data: {
          userId: user.id,
          email: user.email,
          username: user.username,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("[Register API] Internal error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during registration" },
      { status: 500 }
    );
  }
}

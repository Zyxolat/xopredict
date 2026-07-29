import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { verifyPassword, hashPassword, validatePasswordStrength } from "@/lib/password";
import { sendPasswordChangedNotification } from "@/lib/email";

export const dynamic = "force-dynamic";

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Account does not have a password set" },
        { status: 400 }
      );
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Incorrect current password" },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    if (user.email) {
      try {
        await sendPasswordChangedNotification(user.email);
      } catch (emailErr) {
        console.error("[Change Password API] Email notification error:", emailErr);
      }
    }

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error: unknown) {
    console.error("[Change Password API] Internal error:", error);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
}

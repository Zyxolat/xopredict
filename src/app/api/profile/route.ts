import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/profile - Get complete profile of authenticated user
 */
export async function GET() {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        player: {
          select: {
            id: true,
            rank: true,
            totalWonUsdm: true,
            totalPlayed: true,
            streakDays: true,
            vipExpiresAt: true,
            seasonXp: {
              select: { xp: true, season: { select: { name: true } } },
            },
          },
        },
        wallets: {
          select: {
            id: true,
            address: true,
            walletType: true,
            network: true,
            isPrimary: true,
            verifiedAt: true,
          },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error("GET /api/profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(300).optional(),
  avatarUrl: z.string().url().or(z.literal("")).optional(),
});

/**
 * PATCH /api/profile - Update authenticated user profile details
 */
export async function PATCH(request: Request) {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const { displayName, bio, avatarUrl } = parsed.data;

    const updatedUser = await prisma.user.update({
      where: { id: auth.user.id },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(bio !== undefined && { bio }),
        ...(avatarUrl !== undefined && { avatarUrl: avatarUrl || null }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("PATCH /api/profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      include: {
        player: {
          include: {
            seasonXp: {
              include: { season: true },
            },
          },
        },
        wallets: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error("GET /api/players/me error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

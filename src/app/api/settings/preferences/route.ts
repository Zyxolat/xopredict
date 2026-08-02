import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const preferencesSchema = z
  .object({
    notifyMatchSettlement: z.boolean(),
    notifySecurityAlerts: z.boolean(),
    notifyPromotions: z.boolean(),
    showOnLeaderboard: z.boolean(),
    allowMatchHistoryView: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one preference field is required",
  });

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: {
      notifyMatchSettlement: true,
      notifySecurityAlerts: true,
      notifyPromotions: true,
      showOnLeaderboard: true,
      allowMatchHistoryView: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ data: user });
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = preferencesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: auth.user.id },
      data: parsed.data,
      select: {
        notifyMatchSettlement: true,
        notifySecurityAlerts: true,
        notifyPromotions: true,
        showOnLeaderboard: true,
        allowMatchHistoryView: true,
      },
    });

    return NextResponse.json({ data: user });
  } catch (error: unknown) {
    console.error("[Settings Preferences API] Internal error:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}

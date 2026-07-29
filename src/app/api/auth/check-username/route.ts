import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get("username")?.trim();

    if (!username) {
      return NextResponse.json(
        { available: false, error: "Username parameter is required" },
        { status: 400 }
      );
    }

    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        {
          available: false,
          error: "Username must be 3-20 characters long and contain only letters, numbers, and underscores.",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findFirst({
      where: {
        username: { equals: username, mode: "insensitive" },
      },
    });

    if (existing) {
      return NextResponse.json({ available: false, error: "Username is already taken" });
    }

    return NextResponse.json({ available: true });
  } catch (error) {
    console.error("[Check Username API] Error:", error);
    return NextResponse.json(
      { available: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

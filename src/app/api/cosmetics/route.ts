/**
 * GET /api/cosmetics - Get shop and player owned cosmetics
 * POST /api/cosmetics/purchase - Buy cosmetic
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addressSchema } from "@/lib/validation";
import { getCosmeticPrice, validateCosmeticPurchase } from "@/lib/gamification";

export const dynamic = "force-dynamic";

const SHOP_ITEMS = [
  { type: "card_back", name: "gold", displayName: "Gold Card Back" },
  { type: "card_back", name: "neon", displayName: "Neon Card Back" },
  { type: "flip_fx", name: "holographic", displayName: "Holographic Flip" },
  { type: "flip_fx", name: "matrix", displayName: "Matrix Flip" },
  { type: "frame", name: "diamond", displayName: "Diamond Frame" },
  { type: "frame", name: "cosmic", displayName: "Cosmic Frame" },
];

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get("address");

    // Get shop
    const shop = SHOP_ITEMS.map((item) => ({
      ...item,
      price: getCosmeticPrice(item.type, item.name),
    }));

    // If address provided, get owned cosmetics
    let owned: Array<{ id: string; playerAddress: string; type: string; name: string; purchasedAt: Date }> = [];
    if (address) {
      const parsed = addressSchema.safeParse(address);
      if (parsed.success) {
        owned = await prisma.cosmeticOwned.findMany({
          where: { playerAddress: parsed.data.toLowerCase() },
        });
      }
    }

    return NextResponse.json({
      data: { shop, owned },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { address, type, name } = await req.json();

    const parsed = addressSchema.safeParse(address);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const playerAddress = parsed.data.toLowerCase();

    // Get player
    const player = await prisma.player.findUnique({
      where: { address: playerAddress },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Validate purchase
    const balance = Number(player.totalWonUsdm);
    const validation = validateCosmeticPurchase(type, name, balance);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.reason },
        { status: 400 }
      );
    }

    const price = getCosmeticPrice(type, name);

    // Check if already owned
    const alreadyOwned = await prisma.cosmeticOwned.findFirst({
      where: { playerAddress, type, name },
    });

    if (alreadyOwned) {
      return NextResponse.json(
        { error: "Already owned" },
        { status: 409 }
      );
    }

    // Create cosmetic purchase record
    const cosmetic = await prisma.cosmeticOwned.create({
      data: {
        playerAddress,
        type,
        name,
      },
    });

    // In production: transfer USDm from player account
    // For now: deduct from totalWonUsdm (not realistic but works for demo)

    return NextResponse.json(
      { data: { cosmetic, remainingBalance: balance - price } },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

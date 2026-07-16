import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ data: [
    { rank: 1, address: "0xAres", totalWonUsdm: "1842.30" },
    { rank: 2, address: "Void_Runner", totalWonUsdm: "1285.10" },
  ] });
}

import { NextRequest, NextResponse } from "next/server";
import { yahooSearch } from "@/lib/yahoo";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json([]);

  try {
    const data = await yahooSearch(q);
    const results = (data?.quotes ?? [])
      .filter((r: { quoteType: string }) => r.quoteType === "EQUITY" || r.quoteType === "ETF")
      .slice(0, 10)
      .map((r: { symbol: string; shortname?: string; longname?: string; quoteType: string }) => ({
        symbol: r.symbol,
        name: r.shortname ?? r.longname ?? r.symbol,
        type: r.quoteType,
      }));

    return NextResponse.json(results);
  } catch (err) {
    console.error("[search]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "query required" }, { status: 400 });

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=5&newsCount=0`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const data = await res.json();
    const quotes = (data?.quotes ?? []).filter(
      (r: { quoteType: string }) => r.quoteType === "EQUITY" || r.quoteType === "ETF"
    );

    if (quotes.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const top = quotes[0];
    return NextResponse.json({
      symbol: top.symbol,
      name: top.shortname ?? top.longname ?? top.symbol,
      type: top.quoteType,
      exchange: top.exchDisp ?? null,
    });
  } catch (err) {
    console.error("[resolve]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

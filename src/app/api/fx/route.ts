import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from")?.toUpperCase();
  const to = (req.nextUrl.searchParams.get("to") ?? "EUR").toUpperCase();

  if (!from) return NextResponse.json({ error: "from required" }, { status: 400 });
  if (from === to) return NextResponse.json({ rate: 1 });

  try {
    const symbol = `${from}${to}=X`;
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const data = await res.json();
    const rate = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (!rate) return NextResponse.json({ error: "Rate not found" }, { status: 404 });
    return NextResponse.json({ rate });
  } catch (err) {
    console.error("[fx]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { yahooQuote } from "@/lib/yahoo";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  try {
    const data = await yahooQuote(symbol);
    const r = data?.quoteSummary?.result?.[0];
    if (!r) return NextResponse.json({ error: "No data" }, { status: 404 });

    const profile = r.assetProfile ?? {};
    const detail = r.summaryDetail ?? {};
    const price = r.price ?? {};

    return NextResponse.json({
      name: price.longName ?? price.shortName ?? symbol,
      description: profile.longBusinessSummary ?? null,
      sector: profile.sector ?? null,
      industry: profile.industry ?? null,
      country: profile.country ?? null,
      website: profile.website ?? null,
      employees: profile.fullTimeEmployees ?? null,
      marketCap: price.marketCap?.raw ?? null,
      currency: price.currency ?? null,
      currentPrice: price.regularMarketPrice?.raw ?? null,
      change: price.regularMarketChange?.raw ?? null,
      changePercent: price.regularMarketChangePercent?.raw ?? null,
      peRatio: detail.trailingPE?.raw ?? null,
      fiftyTwoWeekHigh: detail.fiftyTwoWeekHigh?.raw ?? null,
      fiftyTwoWeekLow: detail.fiftyTwoWeekLow?.raw ?? null,
      dividendYield: detail.dividendYield?.raw ?? null,
    });
  } catch (err) {
    console.error("[info]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

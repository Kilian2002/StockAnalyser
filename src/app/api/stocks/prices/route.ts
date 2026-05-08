import { NextRequest, NextResponse } from "next/server";

async function fetchFx(currency: string): Promise<number> {
  if (currency === "EUR") return 1;
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${currency}EUR=X?interval=1d&range=1d`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const data = await res.json();
    return data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? 1;
  } catch {
    return 1;
  }
}

export async function GET(req: NextRequest) {
  const symbols = req.nextUrl.searchParams.get("symbols");
  if (!symbols) return NextResponse.json({});

  const symbolList = symbols.split(",").filter(Boolean);

  const results = await Promise.all(
    symbolList.map(async (symbol) => {
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
          { headers: { "User-Agent": "Mozilla/5.0" } }
        );
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta) return [symbol, null];

        const price = meta.regularMarketPrice;
        const prev = meta.previousClose ?? meta.chartPreviousClose;
        const change = prev ? price - prev : 0;
        const changePercent = prev ? (change / prev) * 100 : 0;
        const currency = meta.currency;

        const fxToEUR = await fetchFx(currency);
        const priceEUR = price * fxToEUR;

        return [symbol, { price, priceEUR, currency, fxToEUR, change, changePercent }];
      } catch {
        return [symbol, null];
      }
    })
  );

  const prices: Record<string, { price: number; priceEUR: number; currency: string; fxToEUR: number; change: number; changePercent: number }> = {};
  for (const [symbol, data] of results as [string, { price: number; priceEUR: number; currency: string; fxToEUR: number; change: number; changePercent: number } | null][]) {
    if (data) prices[symbol] = data;
  }

  return NextResponse.json(prices);
}

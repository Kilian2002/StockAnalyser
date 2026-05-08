import { NextRequest, NextResponse } from "next/server";
import { yahooChart } from "@/lib/yahoo";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  try {
    const data = await yahooChart(symbol, 90);
    const result = data?.chart?.result?.[0];
    if (!result) return NextResponse.json({ error: "No data" }, { status: 404 });

    const timestamps: number[] = result.timestamp;
    const q = result.indicators.quote[0];

    const candles = timestamps.map((t: number, i: number) => ({
      time: t,
      open: q.open[i],
      high: q.high[i],
      low: q.low[i],
      close: q.close[i],
    })).filter((c: { open: number }) => c.open != null);

    return NextResponse.json(candles);
  } catch (err) {
    console.error("[candles]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

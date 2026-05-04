import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const to = Math.floor(Date.now() / 1000);
  const from = to - 90 * 24 * 60 * 60; // 90 days

  const res = await fetch(
    `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${process.env.FINNHUB_API_KEY}`
  );
  const data = await res.json();

  if (data.s !== "ok") return NextResponse.json({ error: "No data" }, { status: 404 });

  const candles = (data.t as number[]).map((time: number, i: number) => ({
    time: time as number,
    open: data.o[i],
    high: data.h[i],
    low: data.l[i],
    close: data.c[i],
  }));

  return NextResponse.json(candles);
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const to = new Date().toISOString().split("T")[0];
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const res = await fetch(
    `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${process.env.FINNHUB_API_KEY}`
  );
  const data = await res.json();

  const news = (data as Array<{
    headline: string;
    url: string;
    source: string;
    datetime: number;
    summary: string;
    image: string;
  }>).slice(0, 8).map((n) => ({
    headline: n.headline,
    url: n.url,
    source: n.source,
    datetime: n.datetime,
    summary: n.summary,
    image: n.image,
  }));

  return NextResponse.json(news);
}

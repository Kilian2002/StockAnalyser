import { NextRequest, NextResponse } from "next/server";
import { yahooNews } from "@/lib/yahoo";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  try {
    const data = await yahooNews(symbol);
    const news = (data?.news ?? []).map((n: {
      title: string;
      link: string;
      publisher: string;
      providerPublishTime: number;
    }) => ({
      headline: n.title,
      url: n.link,
      source: n.publisher,
      datetime: n.providerPublishTime,
    }));

    return NextResponse.json(news);
  } catch (err) {
    console.error("[news]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

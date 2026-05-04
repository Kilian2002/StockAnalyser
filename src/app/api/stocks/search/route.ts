import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json([]);

  const res = await fetch(
    `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${process.env.FINNHUB_API_KEY}`
  );
  const data = await res.json();

  const results = (data.result ?? [])
    .filter((r: { type: string }) => r.type === "Common Stock")
    .slice(0, 10)
    .map((r: { symbol: string; description: string }) => ({
      symbol: r.symbol,
      name: r.description,
    }));

  return NextResponse.json(results);
}

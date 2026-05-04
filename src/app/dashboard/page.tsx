"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import StockSearch from "@/components/search/StockSearch";
import NewsFeed from "@/components/news/NewsFeed";
import PredictionWidget from "@/components/prediction/PredictionWidget";

const PriceChart = dynamic(() => import("@/components/chart/PriceChart"), { ssr: false });

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [symbol, setSymbol] = useState("AAPL");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-6">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Stock Analyser</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{session?.user?.email}</span>
          <button
            onClick={() => signOut()}
            className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm hover:bg-gray-700 transition"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="mb-6">
        <StockSearch onSelect={setSymbol} />
      </div>

      {/* Current symbol badge */}
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-md bg-blue-600 px-3 py-1 text-sm font-mono font-bold">{symbol}</span>
      </div>

      {/* Chart */}
      <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-300">Price Chart (90 days)</h2>
        <PriceChart symbol={symbol} />
      </div>

      {/* Bottom grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* News */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-300">Latest News</h2>
          <NewsFeed symbol={symbol} />
        </div>

        {/* Prediction */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-300">Technical Indicators</h2>
          <PredictionWidget symbol={symbol} />
        </div>
      </div>
    </div>
  );
}

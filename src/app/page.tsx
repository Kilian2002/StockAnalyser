"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import StockSearch from "@/components/search/StockSearch";
import NewsFeed from "@/components/news/NewsFeed";
import PredictionWidget from "@/components/prediction/PredictionWidget";
import StockInfo from "@/components/info/StockInfo";

const PriceChart = dynamic(() => import("@/components/chart/PriceChart"), { ssr: false });

const QUICK_PICKS = [
  { symbol: "ASML", label: "ASML Holding" },
  { symbol: "AAPL", label: "Apple" },
  { symbol: "BHP.AX", label: "BHP Group" },
  { symbol: "MSFT", label: "Microsoft" },
  { symbol: "TSLA", label: "Tesla" },
  { symbol: "NVDA", label: "NVIDIA" },
];

export default function Dashboard() {
  const [symbol, setSymbol] = useState("ASML");

  return (
    <div>
      {/* Quick Picks */}
      <div className="mb-3 flex flex-wrap gap-2">
        {QUICK_PICKS.map((p) => (
          <button
            key={p.symbol}
            onClick={() => setSymbol(p.symbol)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              symbol === p.symbol
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <StockSearch onSelect={(r) => setSymbol(r.symbol)} />
      </div>

      {/* Stock Info Panel */}
      <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-300">{symbol} — Overview</h2>
        <StockInfo symbol={symbol} />
      </div>

      {/* Chart */}
      <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-300">Price Chart (90 days)</h2>
        <PriceChart symbol={symbol} />
      </div>

      {/* News + Indicators */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-300">Latest News</h2>
          <NewsFeed symbol={symbol} />
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-300">Technical Indicators</h2>
          <PredictionWidget symbol={symbol} />
        </div>
      </div>
    </div>
  );
}

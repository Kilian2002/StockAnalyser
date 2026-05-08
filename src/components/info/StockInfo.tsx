"use client";

import { useEffect, useState } from "react";

interface StockData {
  name: string;
  description: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  website: string | null;
  employees: number | null;
  marketCap: number | null;
  currency: string | null;
  currentPrice: number | null;
  change: number | null;
  changePercent: number | null;
  peRatio: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  dividendYield: number | null;
}

function fmt(n: number | null | undefined, decimals = 2) {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

function fmtMarketCap(n: number | null | undefined) {
  if (n == null || isNaN(n)) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n}`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}

export default function StockInfo({ symbol }: { symbol: string }) {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setLoading(true);
    setExpanded(false);
    fetch(`/api/stocks/info?symbol=${symbol}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [symbol]);

  if (loading) return <p className="text-sm text-gray-400">Loading info...</p>;
  if (!data) return null;

  const changePositive = (data.change ?? 0) >= 0;
  const changePercent = data.changePercent != null ? data.changePercent * 100 : null;

  return (
    <div className="space-y-4">
      {/* Price header */}
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="text-3xl font-bold">
          {data.currency ?? ""} {fmt(data.currentPrice)}
        </span>
        {data.change != null && (
          <span className={`text-sm font-medium ${changePositive ? "text-green-400" : "text-red-400"}`}>
            {changePositive ? "+" : ""}{fmt(data.change)} ({changePositive ? "+" : ""}{fmt(changePercent)}%)
          </span>
        )}
      </div>

      {/* Key stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Market Cap" value={fmtMarketCap(data.marketCap)} />
        <Stat label="P/E Ratio" value={fmt(data.peRatio)} />
        <Stat label="Dividend Yield" value={data.dividendYield ? `${fmt(data.dividendYield * 100)}%` : "—"} />
        <Stat label="52w High" value={data.fiftyTwoWeekHigh ? `${data.currency} ${fmt(data.fiftyTwoWeekHigh)}` : "—"} />
        <Stat label="52w Low" value={data.fiftyTwoWeekLow ? `${data.currency} ${fmt(data.fiftyTwoWeekLow)}` : "—"} />
        <Stat label="Employees" value={data.employees ? data.employees.toLocaleString() : "—"} />
        <Stat label="Sector" value={data.sector ?? "—"} />
        <Stat label="Industry" value={data.industry ?? "—"} />
        <Stat label="Country" value={data.country ?? "—"} />
      </div>

      {/* Description */}
      {data.description && (
        <div>
          <p className={`text-sm text-gray-400 leading-relaxed ${!expanded ? "line-clamp-3" : ""}`}>
            {data.description}
          </p>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="mt-1 text-xs text-blue-400 hover:text-blue-300"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        </div>
      )}

      {/* Website */}
      {data.website && (
        <a
          href={data.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs text-blue-400 hover:underline"
        >
          {data.website}
        </a>
      )}
    </div>
  );
}

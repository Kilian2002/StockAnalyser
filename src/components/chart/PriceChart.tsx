"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries, UTCTimestamp } from "lightweight-charts";

interface Candle {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
}

export default function PriceChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;
    setError(null);
    setLoading(true);

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#111827" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      width: containerRef.current.clientWidth,
      height: 380,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    fetch(`/api/stocks/candles?symbol=${symbol}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || data.error) throw new Error(data.error ?? "Failed to load");
        return data as Candle[];
      })
      .then((data) => {
        if (data.length === 0) throw new Error("No data for this symbol");
        candleSeries.setData(data);
        chart.timeScale().fitContent();
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [symbol]);

  return (
    <div className="relative w-full">
      <div ref={containerRef} className="w-full rounded-lg overflow-hidden" />
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ height: 380 }}>
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center text-sm text-red-400 py-8">
          {error}
        </div>
      )}
    </div>
  );
}

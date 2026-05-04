"use client";

import { useEffect, useRef } from "react";
import { createChart, IChartApi, CandlestickData } from "lightweight-charts";

interface Props {
  symbol: string;
}

export default function PriceChart({ symbol }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    chartRef.current = createChart(containerRef.current, {
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

    const candleSeries = chartRef.current.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    fetch(`/api/stocks/candles?symbol=${symbol}`)
      .then((r) => r.json())
      .then((data: CandlestickData[]) => {
        if (Array.isArray(data)) candleSeries.setData(data);
      });

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chartRef.current?.remove();
    };
  }, [symbol]);

  return <div ref={containerRef} className="w-full rounded-lg overflow-hidden" />;
}

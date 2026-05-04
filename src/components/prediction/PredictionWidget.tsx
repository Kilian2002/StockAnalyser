"use client";

import { useEffect, useState } from "react";

interface Candle {
  time: number;
  close: number;
  high: number;
  low: number;
}

interface Signal {
  label: string;
  value: string;
  sentiment: "bullish" | "bearish" | "neutral";
}

function calcSMA(prices: number[], period: number) {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calcRSI(prices: number[], period = 14) {
  if (prices.length < period + 1) return null;
  const changes = prices.slice(-period - 1).map((p, i, arr) => (i === 0 ? 0 : p - arr[i - 1])).slice(1);
  const gains = changes.map((c) => (c > 0 ? c : 0));
  const losses = changes.map((c) => (c < 0 ? -c : 0));
  const avgGain = gains.reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

export default function PredictionWidget({ symbol }: { symbol: string }) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stocks/candles?symbol=${symbol}`)
      .then((r) => r.json())
      .then((candles: Candle[]) => {
        const closes = candles.map((c) => c.close);
        const computed: Signal[] = [];

        const sma20 = calcSMA(closes, 20);
        const sma50 = calcSMA(closes, 50);
        const last = closes[closes.length - 1];

        if (sma20 && sma50) {
          computed.push({
            label: "SMA 20 vs 50",
            value: sma20 > sma50 ? "20 > 50 (Golden)" : "20 < 50 (Death)",
            sentiment: sma20 > sma50 ? "bullish" : "bearish",
          });
        }

        if (sma20) {
          computed.push({
            label: "Price vs SMA 20",
            value: last > sma20 ? `+${((last / sma20 - 1) * 100).toFixed(2)}% above` : `${((last / sma20 - 1) * 100).toFixed(2)}% below`,
            sentiment: last > sma20 ? "bullish" : "bearish",
          });
        }

        const rsi = calcRSI(closes);
        if (rsi !== null) {
          computed.push({
            label: "RSI (14)",
            value: rsi.toFixed(1),
            sentiment: rsi > 70 ? "bearish" : rsi < 30 ? "bullish" : "neutral",
          });
        }

        setSignals(computed);
        setLoading(false);
      });
  }, [symbol]);

  const sentimentColor = {
    bullish: "text-green-400",
    bearish: "text-red-400",
    neutral: "text-yellow-400",
  };

  if (loading) return <p className="text-gray-400 text-sm">Calculating indicators...</p>;

  return (
    <div className="space-y-3">
      {signals.map((s, i) => (
        <div key={i} className="flex items-center justify-between rounded-lg bg-gray-800 px-4 py-3">
          <span className="text-sm text-gray-300">{s.label}</span>
          <span className={`text-sm font-mono font-semibold ${sentimentColor[s.sentiment]}`}>
            {s.value}
          </span>
        </div>
      ))}
    </div>
  );
}

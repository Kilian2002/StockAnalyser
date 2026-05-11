"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Holding {
  id: string;
  symbol: string;
  name: string;
  isin: string;
  shares: number;
  type: string;
  exchange: string | null;
}

interface PriceData {
  price: number;
  currency: string;
  change: number;
  changePercent: number;
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState("");
  const [shares, setShares] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState<{ symbol: string; name: string; type: string; exchange: string | null } | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [valueVisible, setValueVisible] = useState(true);
  const [pricesVisible, setPricesVisible] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("portfolios")
        .select("*")
        .eq("user_id", user.id);
      if (data) setHoldings(data as Holding[]);
      setLoading(false);
    });
  }, []);

  const fetchPrices = useCallback(async (h: Holding[]) => {
    if (h.length === 0) return;
    const symbols = h.map((x) => x.symbol).join(",");
    const res = await fetch(`/api/stocks/prices?symbols=${encodeURIComponent(symbols)}`);
    const data = await res.json();
    setPrices(data);
  }, []);

  useEffect(() => {
    fetchPrices(holdings);
    const interval = setInterval(() => fetchPrices(holdings), 60_000);
    return () => clearInterval(interval);
  }, [holdings, fetchPrices]);

  async function handleResolve() {
    if (!query.trim()) return;
    setResolving(true);
    setResolved(null);
    setResolveError(null);
    try {
      const res = await fetch(`/api/stocks/resolve?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Not found");
      setResolved(data);
    } catch (err: unknown) {
      setResolveError(err instanceof Error ? err.message : "Not found");
    } finally {
      setResolving(false);
    }
  }

  async function handleAdd() {
    if (!resolved || !shares) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("portfolios")
      .insert({
        user_id: user.id,
        symbol: resolved.symbol,
        name: resolved.name,
        isin: query.trim().toUpperCase(),
        shares: parseFloat(shares),
        type: resolved.type,
        exchange: resolved.exchange,
      })
      .select()
      .single();

    if (!error && data) {
      const updated = [...holdings, data as Holding];
      setHoldings(updated);
      fetchPrices(updated);
    }

    setShowAdd(false);
    setQuery("");
    setShares("");
    setResolved(null);
  }

  async function handleRemove(id: string) {
    const supabase = createClient();
    await supabase.from("portfolios").delete().eq("id", id);
    setHoldings((prev) => prev.filter((h) => h.id !== id));
  }

  async function adjustShares(id: string, delta: number) {
    const holding = holdings.find((h) => h.id === id);
    if (!holding) return;
    const next = Math.max(0, parseFloat((holding.shares + delta).toFixed(10)));
    const supabase = createClient();
    await supabase.from("portfolios").update({ shares: next }).eq("id", id);
    setHoldings((prev) => prev.map((h) => (h.id === id ? { ...h, shares: next } : h)));
  }

  const totalsByCurrency = holdings.reduce<Record<string, number>>((acc, h) => {
    const p = prices[h.symbol];
    if (!p) return acc;
    acc[p.currency] = (acc[p.currency] ?? 0) + p.price * h.shares;
    return acc;
  }, {});

  if (loading) return <p className="text-gray-400">Loading portfolio...</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Portfolio</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium hover:bg-blue-500 transition"
        >
          + Add Position
        </button>
      </div>

      {holdings.length > 0 && (
        <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-400">Total Portfolio Value</p>
            <button
              onClick={() => setValueVisible((v) => !v)}
              className="text-xs text-gray-500 hover:text-gray-300 transition"
            >
              {valueVisible ? "Hide" : "Show"}
            </button>
          </div>
          {!valueVisible ? (
            <p className="text-3xl font-bold tracking-widest text-gray-600">••••••</p>
          ) : Object.keys(totalsByCurrency).length === 0 ? (
            <p className="text-gray-500 text-sm">Loading prices...</p>
          ) : (
            <div className="flex flex-wrap gap-6">
              {Object.entries(totalsByCurrency).map(([currency, total]) => (
                <div key={currency}>
                  <span className="text-3xl font-bold">{fmt(total)}</span>
                  <span className="ml-2 text-lg text-gray-400">{currency}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {holdings.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-gray-500">
          <p>No positions yet.</p>
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 transition"
          >
            Add your first position
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">ISIN / WKN</th>
                <th className="px-4 py-3">Ticker</th>
                <th className="px-4 py-3 text-right">Shares</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3 text-right">Day %</th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => setPricesVisible((v) => !v)}
                    className="text-gray-500 hover:text-gray-300 transition"
                  >
                    {pricesVisible ? "Hide" : "Show"}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => {
                const p = prices[h.symbol];
                const value = (p?.price ?? 0) * h.shares;
                const changePositive = (p?.changePercent ?? 0) >= 0;
                return (
                  <tr key={h.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{h.name}</p>
                      <p className="text-xs text-gray-500">{h.type} · {h.exchange ?? ""}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-400 text-xs">{h.isin}</td>
                    <td className="px-4 py-3 font-mono text-blue-400 font-bold">{h.symbol}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => adjustShares(h.id, -1)}
                          className="flex h-6 w-6 items-center justify-center rounded bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition text-sm leading-none"
                        >
                          −
                        </button>
                        <span className="w-12 text-center text-gray-300 tabular-nums">{h.shares}</span>
                        <button
                          onClick={() => adjustShares(h.id, 1)}
                          className="flex h-6 w-6 items-center justify-center rounded bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition text-sm leading-none"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {pricesVisible ? (p ? `${fmt(p.price)} ${p.currency}` : "—") : <span className="text-gray-600">••••</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-white">
                      {pricesVisible ? (p ? `${fmt(value)} ${p.currency}` : "—") : <span className="text-gray-600">••••</span>}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${changePositive ? "text-green-400" : "text-red-400"}`}>
                      {pricesVisible ? (p ? `${changePositive ? "+" : ""}${fmt(p.changePercent)}%` : "—") : <span className="text-gray-600">••</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRemove(h.id)}
                        className="text-gray-600 hover:text-red-400 transition text-xs"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6">
            <h2 className="mb-4 text-lg font-semibold">Add Position</h2>
            <div className="mb-3">
              <label className="mb-1 block text-xs text-gray-400">ISIN or WKN</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. IE00B4L5Y983 or A0RPWH"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setResolved(null); setResolveError(null); }}
                  onKeyDown={(e) => e.key === "Enter" && handleResolve()}
                />
                <button
                  onClick={handleResolve}
                  disabled={resolving}
                  className="rounded-lg bg-gray-700 px-3 py-2 text-sm hover:bg-gray-600 transition disabled:opacity-50"
                >
                  {resolving ? "..." : "Search"}
                </button>
              </div>
            </div>
            {resolveError && <p className="mb-3 text-sm text-red-400">{resolveError}</p>}
            {resolved && (
              <div className="mb-4 rounded-lg bg-gray-800 px-4 py-3">
                <p className="font-medium text-white">{resolved.name}</p>
                <p className="text-xs text-gray-400">{resolved.symbol} · {resolved.type} · {resolved.exchange}</p>
              </div>
            )}
            {resolved && (
              <div className="mb-4">
                <label className="mb-1 block text-xs text-gray-400">Number of Shares</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 25"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                />
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowAdd(false); setQuery(""); setShares(""); setResolved(null); setResolveError(null); }}
                className="rounded-lg bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              {resolved && shares && (
                <button
                  onClick={handleAdd}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 transition"
                >
                  Add to Portfolio
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

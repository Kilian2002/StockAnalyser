"use client";

import { useEffect, useState, useCallback } from "react";
import StockSearch from "@/components/search/StockSearch";
import {
  Account,
  Position,
  Transaction,
  TRADE_FEE_EUR,
  DEFAULT_INITIAL_CASH,
  defaultAccount,
  loadAccount,
  saveAccount,
  loadPositions,
  savePositions,
  loadTransactions,
  saveTransactions,
  clearAll,
  fetchFxRate,
} from "@/lib/trading";

interface PriceData {
  price: number;
  priceEUR: number;
  currency: string;
  fxToEUR: number;
  change: number;
  changePercent: number;
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function TradingPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [historyOpen, setHistoryOpen] = useState(false);

  // Trade panel state
  const [selected, setSelected] = useState<{ symbol: string; name: string } | null>(null);
  const [shares, setShares] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load on mount
  useEffect(() => {
    setAccount(loadAccount());
    setPositions(loadPositions());
    setTransactions(loadTransactions());
  }, []);

  // Fetch prices for positions + currently selected symbol
  const fetchPrices = useCallback(async () => {
    const symbols = new Set(positions.map((p) => p.symbol));
    if (selected) symbols.add(selected.symbol);
    if (symbols.size === 0) return;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/stocks/prices?symbols=${Array.from(symbols).join(",")}`);
      const data = await res.json();
      setPrices((prev) => ({ ...prev, ...data }));
      setLastUpdated(new Date());
    } finally {
      setRefreshing(false);
    }
  }, [positions, selected]);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30_000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  function resetAccount() {
    if (!confirm("Reset account? This deletes all positions and history.")) return;
    clearAll();
    const a = defaultAccount();
    setAccount(a);
    setPositions([]);
    setTransactions([]);
    setSelected(null);
    setShares("");
    setFeedback(null);
  }

  async function executeBuy() {
    if (!account || !selected) return;
    const n = parseInt(shares, 10);
    if (!n || n <= 0) {
      setFeedback({ type: "err", msg: "Enter a positive whole number of shares." });
      return;
    }
    const p = prices[selected.symbol];
    if (!p) {
      setFeedback({ type: "err", msg: "Price not loaded yet." });
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      const fxRate = await fetchFxRate(p.currency, "EUR");
      const totalEUR = n * p.price * fxRate;
      const cost = totalEUR + TRADE_FEE_EUR;

      if (account.cash < cost) {
        setFeedback({ type: "err", msg: `Insufficient funds. Need €${fmt(cost)}, have €${fmt(account.cash)}.` });
        return;
      }

      const existing = positions.find((x) => x.symbol === selected.symbol);
      let newPositions: Position[];
      if (existing) {
        const totalShares = existing.shares + n;
        const newAvg = (existing.shares * existing.avgBuyPriceEUR + totalEUR) / totalShares;
        newPositions = positions.map((x) =>
          x.symbol === selected.symbol ? { ...x, shares: totalShares, avgBuyPriceEUR: newAvg } : x
        );
      } else {
        newPositions = [
          ...positions,
          {
            symbol: selected.symbol,
            name: selected.name,
            shares: n,
            avgBuyPriceEUR: totalEUR / n,
            currency: p.currency,
          },
        ];
      }

      const newAccount: Account = {
        ...account,
        cash: account.cash - cost,
        totalFees: account.totalFees + TRADE_FEE_EUR,
      };

      const txn: Transaction = {
        id: crypto.randomUUID(),
        type: "buy",
        symbol: selected.symbol,
        name: selected.name,
        shares: n,
        pricePerShareNative: p.price,
        currency: p.currency,
        fxRate,
        totalEUR,
        fee: TRADE_FEE_EUR,
        timestamp: new Date().toISOString(),
      };

      const newTxns = [txn, ...transactions];

      setAccount(newAccount);
      setPositions(newPositions);
      setTransactions(newTxns);
      saveAccount(newAccount);
      savePositions(newPositions);
      saveTransactions(newTxns);
      setShares("");
      setFeedback({ type: "ok", msg: `Bought ${n} × ${selected.symbol} for €${fmt(cost)} (incl. €${TRADE_FEE_EUR} fee).` });
    } catch (e: unknown) {
      setFeedback({ type: "err", msg: e instanceof Error ? e.message : "Trade failed." });
    } finally {
      setBusy(false);
    }
  }

  async function executeSell() {
    if (!account || !selected) return;
    const n = parseInt(shares, 10);
    if (!n || n <= 0) {
      setFeedback({ type: "err", msg: "Enter a positive whole number of shares." });
      return;
    }
    const position = positions.find((x) => x.symbol === selected.symbol);
    if (!position || position.shares < n) {
      setFeedback({ type: "err", msg: `You only own ${position?.shares ?? 0} shares.` });
      return;
    }
    const p = prices[selected.symbol];
    if (!p) {
      setFeedback({ type: "err", msg: "Price not loaded yet." });
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      const fxRate = await fetchFxRate(p.currency, "EUR");
      const totalEUR = n * p.price * fxRate;
      const proceeds = totalEUR - TRADE_FEE_EUR;
      const realizedPnL = totalEUR - position.avgBuyPriceEUR * n - TRADE_FEE_EUR;

      const newPositions =
        position.shares === n
          ? positions.filter((x) => x.symbol !== selected.symbol)
          : positions.map((x) => (x.symbol === selected.symbol ? { ...x, shares: x.shares - n } : x));

      const newAccount: Account = {
        ...account,
        cash: account.cash + proceeds,
        totalFees: account.totalFees + TRADE_FEE_EUR,
      };

      const txn: Transaction = {
        id: crypto.randomUUID(),
        type: "sell",
        symbol: selected.symbol,
        name: selected.name,
        shares: n,
        pricePerShareNative: p.price,
        currency: p.currency,
        fxRate,
        totalEUR,
        fee: TRADE_FEE_EUR,
        timestamp: new Date().toISOString(),
        realizedPnL,
      };

      const newTxns = [txn, ...transactions];

      setAccount(newAccount);
      setPositions(newPositions);
      setTransactions(newTxns);
      saveAccount(newAccount);
      savePositions(newPositions);
      saveTransactions(newTxns);
      setShares("");
      setFeedback({
        type: "ok",
        msg: `Sold ${n} × ${selected.symbol} for €${fmt(proceeds)}. P&L: €${fmt(realizedPnL)}.`,
      });
    } catch (e: unknown) {
      setFeedback({ type: "err", msg: e instanceof Error ? e.message : "Trade failed." });
    } finally {
      setBusy(false);
    }
  }

  if (!account) return <p className="text-gray-400">Loading account...</p>;

  // Calculations
  const ownedShares = selected ? positions.find((p) => p.symbol === selected.symbol)?.shares ?? 0 : 0;
  const livePrice = selected ? prices[selected.symbol] : null;

  const positionsValueEUR = positions.reduce((sum, pos) => {
    const lp = prices[pos.symbol];
    if (!lp) return sum;
    return sum + lp.priceEUR * pos.shares;
  }, 0);

  const totalValue = account.cash + positionsValueEUR;
  const totalReturn = totalValue - account.initialCash;
  const totalReturnPct = (totalReturn / account.initialCash) * 100;

  const realizedPnL = transactions.reduce((s, t) => s + (t.realizedPnL ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Paper Trading</h2>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              {refreshing ? (
                <span className="text-blue-400">Refreshing...</span>
              ) : (
                <>Updated {lastUpdated.toLocaleTimeString("de-DE")}</>
              )}
            </span>
          )}
          <button
            onClick={fetchPrices}
            disabled={refreshing}
            className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm hover:bg-gray-700 transition disabled:opacity-50"
          >
            ↻ Refresh
          </button>
          <button
            onClick={resetAccount}
            className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-1.5 text-sm text-red-400 hover:bg-red-950/50 transition"
          >
            Reset Account
          </button>
        </div>
      </div>

      {/* Account Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-400">Cash</p>
          <p className="mt-1 text-2xl font-bold">€{fmt(account.cash)}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-400">Positions Value</p>
          <p className="mt-1 text-2xl font-bold">≈ €{fmt(positionsValueEUR)}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-400">Total Value</p>
          <p className="mt-1 text-2xl font-bold">≈ €{fmt(totalValue)}</p>
          <p className={`mt-1 text-xs font-medium ${totalReturn >= 0 ? "text-green-400" : "text-red-400"}`}>
            {totalReturn >= 0 ? "+" : ""}€{fmt(totalReturn)} ({totalReturn >= 0 ? "+" : ""}
            {fmt(totalReturnPct)}%)
          </p>
        </div>
        <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4">
          <p className="text-xs text-amber-500">Total Trading Fees</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">€{fmt(account.totalFees)}</p>
          <p className="mt-1 text-xs text-amber-600">
            {transactions.length} trade{transactions.length === 1 ? "" : "s"} · €{TRADE_FEE_EUR} per trade
          </p>
        </div>
      </div>

      {/* Trade Panel */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-300">Trade</h3>

        <div className="mb-3">
          <StockSearch onSelect={(r) => { setSelected(r); setFeedback(null); }} />
        </div>

        {selected && (
          <div className="space-y-3 rounded-lg bg-gray-800/50 p-4">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <div>
                <p className="font-medium text-white">{selected.name}</p>
                <p className="font-mono text-xs text-blue-400">{selected.symbol}</p>
              </div>
              <div className="text-right">
                {livePrice ? (
                  <>
                    <p className="text-xl font-bold">
                      {fmt(livePrice.price)} {livePrice.currency}
                    </p>
                    <p className={`text-xs ${livePrice.changePercent >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {livePrice.changePercent >= 0 ? "+" : ""}
                      {fmt(livePrice.changePercent)}% today
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Loading price...</p>
                )}
              </div>
            </div>

            <div className="text-xs text-gray-400">
              You currently own: <span className="font-mono text-white">{ownedShares}</span> shares
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                step="1"
                placeholder="Number of shares"
                className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={shares}
                onChange={(e) => setShares(e.target.value.replace(/\D/g, ""))}
              />
              <button
                onClick={executeBuy}
                disabled={busy || !livePrice || !shares}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 transition disabled:opacity-50"
              >
                BUY
              </button>
              <button
                onClick={executeSell}
                disabled={busy || !livePrice || !shares || ownedShares === 0}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition disabled:opacity-50"
              >
                SELL
              </button>
            </div>

            {/* Estimate */}
            {livePrice && shares && parseInt(shares, 10) > 0 && (
              <p className="text-xs text-gray-400">
                Estimated total: {fmt(parseInt(shares, 10) * livePrice.price)} {livePrice.currency}
                {" + €"}{TRADE_FEE_EUR} fee
              </p>
            )}

            {feedback && (
              <p className={`text-xs ${feedback.type === "ok" ? "text-green-400" : "text-red-400"}`}>
                {feedback.msg}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Open Positions */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
        <div className="border-b border-gray-800 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-300">Open Positions</h3>
        </div>
        {positions.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">No open positions.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Ticker</th>
                <th className="px-4 py-3 text-right">Shares</th>
                <th className="px-4 py-3 text-right">Avg Buy (EUR)</th>
                <th className="px-4 py-3 text-right">Current</th>
                <th className="px-4 py-3 text-right">Unrealized P&L</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => {
                const p = prices[pos.symbol];
                const currentEUR = p ? p.priceEUR : null;
                const unrealizedPnL = currentEUR !== null ? (currentEUR - pos.avgBuyPriceEUR) * pos.shares : null;
                const unrealizedPct =
                  unrealizedPnL !== null ? ((currentEUR! - pos.avgBuyPriceEUR) / pos.avgBuyPriceEUR) * 100 : null;

                return (
                  <tr key={pos.symbol} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition">
                    <td className="px-4 py-3 font-medium text-white">{pos.name}</td>
                    <td className="px-4 py-3 font-mono text-blue-400">{pos.symbol}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{pos.shares}</td>
                    <td className="px-4 py-3 text-right text-gray-300">€{fmt(pos.avgBuyPriceEUR)}</td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {p ? `${fmt(p.price)} ${p.currency}` : "—"}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        (unrealizedPnL ?? 0) >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {unrealizedPnL !== null
                        ? `${unrealizedPnL >= 0 ? "+" : ""}€${fmt(unrealizedPnL)} (${unrealizedPnL >= 0 ? "+" : ""}${fmt(unrealizedPct ?? 0)}%)`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Transaction History */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
        <button
          onClick={() => setHistoryOpen((o) => !o)}
          className="flex w-full items-center justify-between border-b border-gray-800 px-4 py-3 text-left hover:bg-gray-800/50 transition"
        >
          <h3 className="text-sm font-semibold text-gray-300">
            Transaction History <span className="ml-2 text-gray-500">({transactions.length})</span>
            {realizedPnL !== 0 && (
              <span
                className={`ml-3 text-xs font-medium ${realizedPnL >= 0 ? "text-green-400" : "text-red-400"}`}
              >
                Realized P&L: {realizedPnL >= 0 ? "+" : ""}€{fmt(realizedPnL)}
              </span>
            )}
          </h3>
          <span className="text-gray-500">{historyOpen ? "▲" : "▼"}</span>
        </button>
        {historyOpen &&
          (transactions.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No trades yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Ticker</th>
                  <th className="px-4 py-3 text-right">Shares</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Total (EUR)</th>
                  <th className="px-4 py-3 text-right">Fee</th>
                  <th className="px-4 py-3 text-right">P&L</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-gray-800 last:border-0">
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(t.timestamp).toLocaleString("de-DE")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-bold ${
                          t.type === "buy" ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"
                        }`}
                      >
                        {t.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-blue-400">{t.symbol}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{t.shares}</td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {fmt(t.pricePerShareNative)} {t.currency}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">€{fmt(t.totalEUR)}</td>
                    <td className="px-4 py-3 text-right text-amber-400">€{fmt(t.fee)}</td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        t.realizedPnL == null ? "text-gray-600" : t.realizedPnL >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {t.realizedPnL == null
                        ? "—"
                        : `${t.realizedPnL >= 0 ? "+" : ""}€${fmt(t.realizedPnL)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
      </div>

      <p className="text-center text-xs text-gray-600">
        Starting cash: €{fmt(DEFAULT_INITIAL_CASH)} · Trading fee: €{TRADE_FEE_EUR} per trade · Whole shares only
      </p>
    </div>
  );
}

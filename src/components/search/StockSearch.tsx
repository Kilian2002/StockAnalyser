"use client";

import { useState, useRef, useEffect } from "react";

interface SearchResult {
  symbol: string;
  name: string;
  type?: string;
}

interface Props {
  onSelect: (result: { symbol: string; name: string }) => void;
  placeholder?: string;
}

export default function StockSearch({ onSelect, placeholder = "Search stocks or ETFs (e.g. ASML, MSCI World)..." }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  return (
    <div className="relative w-full max-w-md">
      <input
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && query.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 shadow-xl max-h-80 overflow-auto">
          {loading && <li className="px-4 py-2 text-xs text-gray-500">Searching...</li>}
          {!loading && results.length === 0 && (
            <li className="px-4 py-2 text-xs text-gray-500">No matches found.</li>
          )}
          {results.map((r) => (
            <li
              key={r.symbol}
              className="cursor-pointer px-4 py-2 hover:bg-gray-700"
              onMouseDown={() => {
                onSelect({ symbol: r.symbol, name: r.name });
                setQuery(r.symbol);
                setOpen(false);
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="font-mono font-bold text-blue-400">{r.symbol}</span>
                  <span className="ml-2 text-sm text-gray-400">{r.name}</span>
                </div>
                {r.type && (
                  <span className="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
                    {r.type}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

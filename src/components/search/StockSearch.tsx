"use client";

import { useState, useRef, useEffect } from "react";

interface SearchResult {
  symbol: string;
  name: string;
}

interface Props {
  onSelect: (symbol: string) => void;
}

export default function StockSearch({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length < 1) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data);
      setOpen(true);
    }, 300);
  }, [query]);

  return (
    <div className="relative w-full max-w-md">
      <input
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Search stocks (e.g. AAPL, Tesla)..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 shadow-xl">
          {results.map((r) => (
            <li
              key={r.symbol}
              className="cursor-pointer px-4 py-2 hover:bg-gray-700"
              onMouseDown={() => {
                onSelect(r.symbol);
                setQuery(r.symbol);
                setOpen(false);
              }}
            >
              <span className="font-mono font-bold text-blue-400">{r.symbol}</span>
              <span className="ml-2 text-sm text-gray-400">{r.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

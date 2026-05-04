"use client";

import { useEffect, useState } from "react";

interface NewsItem {
  headline: string;
  url: string;
  source: string;
  datetime: number;
  summary: string;
  image: string;
}

export default function NewsFeed({ symbol }: { symbol: string }) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/news?symbol=${symbol}`)
      .then((r) => r.json())
      .then((data) => {
        setNews(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, [symbol]);

  if (loading)
    return <p className="text-gray-400 text-sm">Loading news...</p>;

  if (news.length === 0)
    return <p className="text-gray-400 text-sm">No recent news found.</p>;

  return (
    <ul className="space-y-3">
      {news.map((item, i) => (
        <li key={i} className="rounded-lg bg-gray-800 p-3 hover:bg-gray-750 transition">
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            <p className="text-sm font-medium text-white leading-snug hover:text-blue-400">
              {item.headline}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {item.source} &middot;{" "}
              {new Date(item.datetime * 1000).toLocaleDateString()}
            </p>
          </a>
        </li>
      ))}
    </ul>
  );
}

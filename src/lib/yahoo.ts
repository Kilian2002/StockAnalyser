const BASE = "https://query1.finance.yahoo.com";

export async function yahooChart(symbol: string, days = 90) {
  const res = await fetch(
    `${BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${days}d`,
    { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 300 } }
  );
  if (!res.ok) throw new Error(`Yahoo chart ${res.status}`);
  return res.json();
}

export async function yahooSearch(q: string) {
  const res = await fetch(
    `${BASE}/v1/finance/search?q=${encodeURIComponent(q)}&newsCount=0&quotesCount=10`,
    { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 60 } }
  );
  if (!res.ok) throw new Error(`Yahoo search ${res.status}`);
  return res.json();
}

export async function yahooQuote(symbol: string) {
  const res = await fetch(
    `${BASE}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=assetProfile%2CsummaryDetail%2Cprice`,
    { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 300 } }
  );
  if (!res.ok) throw new Error(`Yahoo quote ${res.status}`);
  return res.json();
}

export async function yahooNews(symbol: string) {
  const res = await fetch(
    `${BASE}/v1/finance/search?q=${encodeURIComponent(symbol)}&newsCount=8&quotesCount=0`,
    { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 300 } }
  );
  if (!res.ok) throw new Error(`Yahoo news ${res.status}`);
  return res.json();
}

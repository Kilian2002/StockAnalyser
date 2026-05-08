export const DEFAULT_INITIAL_CASH = 50_000;
export const TRADE_FEE_EUR = 1;
export const BASE_CURRENCY = "EUR";

export interface Account {
  cash: number;
  initialCash: number;
  baseCurrency: string;
  totalFees: number;
  createdAt: string;
}

export interface Position {
  symbol: string;
  name: string;
  shares: number;
  avgBuyPriceEUR: number;
  currency: string;
}

export interface Transaction {
  id: string;
  type: "buy" | "sell";
  symbol: string;
  name: string;
  shares: number;
  pricePerShareNative: number;
  currency: string;
  fxRate: number;
  totalEUR: number;
  fee: number;
  timestamp: string;
  realizedPnL?: number;
}

const ACCOUNT_KEY = "paper_account";
const POSITIONS_KEY = "paper_positions";
const TRANSACTIONS_KEY = "paper_transactions";

export function defaultAccount(): Account {
  return {
    cash: DEFAULT_INITIAL_CASH,
    initialCash: DEFAULT_INITIAL_CASH,
    baseCurrency: BASE_CURRENCY,
    totalFees: 0,
    createdAt: new Date().toISOString(),
  };
}

export function loadAccount(): Account {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    return raw ? JSON.parse(raw) : defaultAccount();
  } catch {
    return defaultAccount();
  }
}

export function saveAccount(a: Account) {
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(a));
}

export function loadPositions(): Position[] {
  try {
    return JSON.parse(localStorage.getItem(POSITIONS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function savePositions(p: Position[]) {
  localStorage.setItem(POSITIONS_KEY, JSON.stringify(p));
}

export function loadTransactions(): Transaction[] {
  try {
    return JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveTransactions(t: Transaction[]) {
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(t));
}

export function clearAll() {
  localStorage.removeItem(ACCOUNT_KEY);
  localStorage.removeItem(POSITIONS_KEY);
  localStorage.removeItem(TRANSACTIONS_KEY);
}

export async function fetchFxRate(from: string, to = BASE_CURRENCY): Promise<number> {
  if (from === to) return 1;
  const res = await fetch(`/api/fx?from=${from}&to=${to}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "FX rate unavailable");
  return data.rate;
}

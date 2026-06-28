import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Tab = 'gainers' | 'losers' | '52h' | '52l';

type YahooQuote = {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
};

const UA = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
  Accept: '*/*',
};

const AU_BASE = [
  { operator: 'eq', operands: ['region', 'au'] },
  { operator: 'gt', operands: ['intradaymarketcap', 500_000_000] },
];

let creds: { cookie: string; crumb: string; ts: number } | null = null;
async function getCreds() {
  if (creds && Date.now() - creds.ts < 30 * 60 * 1000) return creds;
  const r = await fetch('https://fc.yahoo.com/', { headers: UA });
  const jar = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : [];
  const cookie = jar.map((c) => c.split(';')[0]).join('; ');
  const crumb = (await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', { headers: { ...UA, cookie } }).then((res) => res.text())).trim();
  if (!cookie || !crumb || crumb.startsWith('{') || crumb.length > 40) throw new Error('Failed to obtain Yahoo crumb');
  creds = { cookie, crumb, ts: Date.now() };
  return creds;
}

async function screener(operands: object[], sortField: string, sortType: 'ASC' | 'DESC', size: number): Promise<YahooQuote[]> {
  const { cookie, crumb } = await getCreds();
  const body = {
    size, offset: 0, sortField, sortType, quoteType: 'EQUITY',
    query: { operator: 'AND', operands: [...AU_BASE, ...operands] },
    userId: '', userIdType: 'guid',
  };
  const res = await fetch(`https://query1.finance.yahoo.com/v1/finance/screener?crumb=${encodeURIComponent(crumb)}&lang=en-AU&region=AU`, {
    method: 'POST', headers: { ...UA, cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) { creds = null; throw new Error(`screener HTTP ${res.status}`); }
  const json = await res.json();
  return json?.finance?.result?.[0]?.quotes ?? [];
}

function toRow(q: YahooQuote) {
  return {
    ticker: q.symbol.replace(/\.AX$/i, ''),
    name: q.shortName || q.longName || q.symbol,
    price: q.regularMarketPrice ?? 0,
    change: q.regularMarketChange ?? 0,
    changePct: q.regularMarketChangePercent ?? 0,
  };
}

const cache = new Map<Tab, { data: ReturnType<typeof toRow>[]; updatedAt: string; ts: number }>();

async function buildTab(tab: Tab): Promise<ReturnType<typeof toRow>[]> {
  if (tab === 'gainers') {
    const q = await screener([{ operator: 'gt', operands: ['percentchange', 0] }, { operator: 'lt', operands: ['percentchange', 300] }], 'percentchange', 'DESC', 6);
    return q.map(toRow);
  }
  if (tab === 'losers') {
    const q = await screener([{ operator: 'lt', operands: ['percentchange', 0] }, { operator: 'gt', operands: ['percentchange', -300] }], 'percentchange', 'ASC', 6);
    return q.map(toRow);
  }
  const universe = await screener([], 'intradaymarketcap', 'DESC', 100);
  if (tab === '52h') {
    return universe
      .filter((q) => q.fiftyTwoWeekHigh && q.regularMarketPrice && q.regularMarketPrice / q.fiftyTwoWeekHigh >= 0.95)
      .sort((a, b) => (b.regularMarketPrice! / b.fiftyTwoWeekHigh!) - (a.regularMarketPrice! / a.fiftyTwoWeekHigh!))
      .slice(0, 6).map(toRow);
  }
  return universe
    .filter((q) => q.fiftyTwoWeekLow && q.regularMarketPrice && q.regularMarketPrice / q.fiftyTwoWeekLow <= 1.05)
    .sort((a, b) => (a.regularMarketPrice! / a.fiftyTwoWeekLow!) - (b.regularMarketPrice! / b.fiftyTwoWeekLow!))
    .slice(0, 6).map(toRow);
}

export async function GET(req: NextRequest) {
  const tab = (req.nextUrl.searchParams.get('tab') ?? 'gainers') as Tab;

  const cached = cache.get(tab);
  if (cached && Date.now() - cached.ts < 5 * 60 * 1000) {
    return NextResponse.json({ data: cached.data, updatedAt: cached.updatedAt });
  }

  try {
    const data = await buildTab(tab);
    const updatedAt = new Date().toLocaleString('en-AU', {
      timeZone: 'Australia/Sydney', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    cache.set(tab, { data, updatedAt, ts: Date.now() });
    return NextResponse.json({ data, updatedAt });
  } catch (e) {
    if (cached) return NextResponse.json({ data: cached.data, updatedAt: cached.updatedAt });
    return NextResponse.json({ data: [], updatedAt: null, error: String(e) });
  }
}

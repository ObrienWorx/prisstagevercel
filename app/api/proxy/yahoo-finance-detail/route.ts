import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface StockDetail {
  symbol: string;
  name: string;
  open: number | null;
  high: number | null;
  low: number | null;
  price: number | null;
  volume: number | null;
  prevClose: number | null;
  change: number | null;
  changePct: number | null;
  marketCap: number | null;
}

const UA = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
  Accept: '*/*',
};

let creds: { cookie: string; crumb: string; ts: number } | null = null;
async function getCreds() {
  if (creds && Date.now() - creds.ts < 30 * 60 * 1000) return creds;
  const r = await fetch('https://fc.yahoo.com/', { headers: UA });
  const jar = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : [];
  const cookie = jar.map((c: string) => c.split(';')[0]).join('; ');
  const crumb = (await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', { headers: { ...UA, cookie } }).then(res => res.text())).trim();
  if (!cookie || !crumb || crumb.startsWith('{') || crumb.length > 40) throw new Error('crumb failed');
  creds = { cookie, crumb, ts: Date.now() };
  return creds;
}

async function fetchOne(sym: string, cookie: string, crumb: string): Promise<StockDetail> {
  const empty: StockDetail = { symbol: sym, name: sym, open: null, high: null, low: null, price: null, volume: null, prevClose: null, change: null, changePct: null, marketCap: null };
  try {
    // v8 chart — open comes from indicators (meta.regularMarketOpen is often null)
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d&crumb=${encodeURIComponent(crumb)}`;
    const [chartRes, summaryRes] = await Promise.all([
      fetch(chartUrl, { headers: { ...UA, cookie } }),
      fetch(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=price&crumb=${encodeURIComponent(crumb)}`, { headers: { ...UA, cookie } }),
    ]);

    const chart   = await chartRes.json();
    const summary = await summaryRes.json();

    const result = chart?.chart?.result?.[0];
    const meta   = result?.meta;
    const ohlcv  = result?.indicators?.quote?.[0];

    if (!meta) return empty;

    const price     = meta.regularMarketPrice ?? null;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? null;
    const change    = price != null && prevClose != null ? price - prevClose : null;
    const changePct = change != null && prevClose ? (change / prevClose) * 100 : null;

    // open from indicators (last non-null value in today's candle array)
    const openArr: (number | null)[] = ohlcv?.open ?? [];
    const open = openArr.filter(Boolean).at(-1) ?? meta.regularMarketOpen ?? null;

    const marketCap = summary?.quoteSummary?.result?.[0]?.price?.marketCap?.raw ?? null;

    return {
      symbol: sym,
      name:   meta.longName ?? meta.shortName ?? sym,
      open,
      high:      meta.regularMarketDayHigh ?? null,
      low:       meta.regularMarketDayLow ?? null,
      price,
      volume:    meta.regularMarketVolume ?? null,
      prevClose,
      change,
      changePct,
      marketCap,
    };
  } catch {
    return empty;
  }
}

export async function GET(req: NextRequest) {
  const symbols = (new URL(req.url).searchParams.get('symbols') ?? '')
    .split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

  if (symbols.length === 0)
    return NextResponse.json({ success: false, error: 'No symbols provided' }, { status: 400 });

  try {
    const { cookie, crumb } = await getCreds();
    const results = await Promise.all(symbols.map(sym => fetchOne(sym, cookie, crumb)));
    const data: Record<string, StockDetail> = {};
    for (const r of results) data[r.symbol] = r;
    return NextResponse.json({ success: true, data });
  } catch {
    creds = null;
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

const EODHD_TOKEN = process.env.EODHD_API_KEY ?? '';

type Tab = 'gainers' | 'losers' | '52h' | '52l';

type EodhdStock = {
  code: string;
  name: string;
  close: number;
  change?: number;
  change_p: number;
  market_cap: number;
  high_52w?: number;
  low_52w?: number;
};

async function fetchScreener(params: Record<string, string>): Promise<EodhdStock[]> {
  if (!EODHD_TOKEN) return [];
  const qs = new URLSearchParams({ api_token: EODHD_TOKEN, ...params });
  try {
    const res = await fetch(`https://eodhd.com/api/screener?${qs}`, {
      next: { revalidate: 300 },
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data ?? [];
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const tab = (req.nextUrl.searchParams.get('tab') ?? 'gainers') as Tab;

  if (!EODHD_TOKEN) {
    return NextResponse.json({ data: [], updatedAt: null, error: 'EODHD_API_KEY not configured' });
  }

  const baseMcap = '500000000';
  let stocks: EodhdStock[] = [];

  if (tab === 'gainers') {
    stocks = await fetchScreener({
      filters: JSON.stringify([['exchange', '=', 'AU'], ['market_cap', '>=', baseMcap], ['change_p', '>', '0'], ['change_p', '<=', '300']]),
      sort: 'change_p,desc',
      limit: '6',
      offset: '0',
    });
  } else if (tab === 'losers') {
    stocks = await fetchScreener({
      filters: JSON.stringify([['exchange', '=', 'AU'], ['market_cap', '>=', baseMcap], ['change_p', '<', '0'], ['change_p', '>=', '-300']]),
      sort: 'change_p,asc',
      limit: '6',
      offset: '0',
    });
  } else if (tab === '52h') {
    const raw = await fetchScreener({
      filters: JSON.stringify([['exchange', '=', 'AU'], ['market_cap', '>=', baseMcap], ['change_p', '>=', '-300'], ['change_p', '<=', '300']]),
      sort: 'high_52w,desc',
      limit: '50',
      offset: '0',
    });
    stocks = raw
      .filter(s => s.high_52w && s.high_52w > 0 && s.close / s.high_52w >= 0.95)
      .slice(0, 6);
  } else {
    const raw = await fetchScreener({
      filters: JSON.stringify([['exchange', '=', 'AU'], ['market_cap', '>=', baseMcap], ['change_p', '>=', '-300'], ['change_p', '<=', '300']]),
      sort: 'low_52w,asc',
      limit: '50',
      offset: '0',
    });
    stocks = raw
      .filter(s => s.low_52w && s.low_52w > 0 && s.close / s.low_52w <= 1.05)
      .slice(0, 6);
  }

  const updatedAt = new Date().toLocaleString('en-AU', {
    timeZone: 'Australia/Sydney',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return NextResponse.json({
    data: stocks.map(s => ({
      ticker: s.code,
      name: s.name,
      price: s.close,
      change: s.change ?? (s.close * (s.change_p / 100) / (1 + s.change_p / 100)),
      changePct: s.change_p,
    })),
    updatedAt,
  });
}

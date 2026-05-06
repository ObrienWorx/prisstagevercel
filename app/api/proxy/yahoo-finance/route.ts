import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const symbols = (new URL(req.url).searchParams.get('symbols') ?? '')
    .split(',').map(s => s.trim()).filter(Boolean);

  if (symbols.length === 0)
    return NextResponse.json({ success: false, error: 'No symbols provided' }, { status: 400 });

  const results: Record<string, { price: number | null; name: string }> = {};

  await Promise.all(symbols.map(async (sym) => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
        next: { revalidate: 60 },
      });
      const json = await res.json();
      const meta = json?.chart?.result?.[0]?.meta;
      results[sym] = {
        price: meta?.regularMarketPrice ?? null,
        name:  meta?.longName ?? meta?.shortName ?? sym,
      };
    } catch {
      results[sym] = { price: null, name: sym };
    }
  }));

  return NextResponse.json({ success: true, data: results });
}

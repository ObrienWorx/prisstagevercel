import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q') ?? '';
  if (!q.trim()) return NextResponse.json({ success: true, results: [] });

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&enableFuzzyQuery=true&quotesQueryId=tss_match_phrase_query`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      next: { revalidate: 30 },
    });
    const json = await res.json();
    const results = (json?.quotes ?? [])
      .filter((q: { quoteType?: string }) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
      .map((q: { symbol: string; shortname?: string; longname?: string; exchange?: string }) => ({
        symbol:   q.symbol,
        name:     q.longname || q.shortname || q.symbol,
        exchange: q.exchange ?? '',
      }));
    return NextResponse.json({ success: true, results });
  } catch {
    return NextResponse.json({ success: false, results: [] });
  }
}

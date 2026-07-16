import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Report from '@/models/Report';
import { notFutureDated } from '@/lib/reportVisibility';

export const dynamic = 'force-dynamic';

const PER_PAGE = 10;

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Australia/Sydney',
  });
}

function profitLossPercent(start?: number, end?: number) {
  if (!start || start <= 0 || end === undefined || end === null) return null;
  return ((end - start) / start) * 100;
}

function yahooSymbol(ticker: string, index: string) {
  const t = (ticker || '').trim().toUpperCase();
  if (!t || t.includes('.')) return t;
  return index.trim().toUpperCase() === 'ASX' ? `${t}.AX` : t;
}

async function fetchLiveQuote(ticker: string, index: string) {
  const symbol = yahooSymbol(ticker, index);
  if (!symbol) return null;
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`,
      { cache: 'no-store', headers: { accept: 'application/json', 'user-agent': 'PristineGaze/1.0' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice ?? meta?.previousClose;
    if (typeof price !== 'number' || !Number.isFinite(price)) return null;
    return { price, currency: meta?.currency || '' };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tab = sp.get('tab') || 'past';
  const page = Math.max(1, Number(sp.get('page') || 1));
  const search = sp.get('search')?.trim() || '';
  const sortKey = sp.get('sort') || 'buyingDate';
  const sortDir = (sp.get('dir') || 'desc') as 'asc' | 'desc';

  await connectDB();

  if (tab === 'past') {
    const sellReports = await Report.find({
      publishStatus: 'published',
      ...notFutureDated(),
      recommendation: 'SELL',
      pastStockRecommendations: { $exists: true, $ne: [] },
    })
      .populate('pastStockRecommendations', 'slug ticker upsellTicker price createdAt')
      .sort({ createdAt: -1 })
      .lean() as unknown as Array<{
        slug: string;
        price: number;
        createdAt: Date;
        pastStockRecommendations: Array<{ slug: string; ticker: string; upsellTicker: string; price: number; createdAt: Date }>;
      }>;

    type PastRow = {
      ticker: string;
      index: string;
      buyingDate: string;
      buyingDateRaw: number;
      buyReportSlug: string;
      sellingDate: string;
      sellingDateRaw: number;
      sellReportSlug: string;
      buyingPrice: number;
      sellingPrice: number;
      profitLoss: number | null;
    };

    let rows: PastRow[] = sellReports.flatMap((sell) =>
      (sell.pastStockRecommendations || []).map((buy) => ({
        ticker: buy.ticker || buy.upsellTicker || '-',
        index: buy.upsellTicker || '-',
        buyingDate: formatDate(buy.createdAt),
        buyingDateRaw: new Date(buy.createdAt).getTime(),
        buyReportSlug: buy.slug,
        sellingDate: formatDate(sell.createdAt),
        sellingDateRaw: new Date(sell.createdAt).getTime(),
        sellReportSlug: sell.slug,
        buyingPrice: Number(buy.price || 0),
        sellingPrice: Number(sell.price || 0),
        profitLoss: profitLossPercent(Number(buy.price), Number(sell.price)),
      }))
    );

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.ticker.toLowerCase().includes(q) ||
          r.index.toLowerCase().includes(q) ||
          r.buyingDate.toLowerCase().includes(q) ||
          r.sellingDate.toLowerCase().includes(q)
      );
    }

    rows.sort((a, b) => {
      let av: unknown, bv: unknown;
      switch (sortKey) {
        case 'ticker':       av = a.ticker;       bv = b.ticker;       break;
        case 'index':        av = a.index;        bv = b.index;        break;
        case 'sellingDate':  av = a.sellingDateRaw; bv = b.sellingDateRaw; break;
        case 'buyingPrice':  av = a.buyingPrice;  bv = b.buyingPrice;  break;
        case 'sellingPrice': av = a.sellingPrice; bv = b.sellingPrice; break;
        case 'profitLoss':   av = a.profitLoss;   bv = b.profitLoss;   break;
        default:             av = a.buyingDateRaw; bv = b.buyingDateRaw;
      }
      const aMissing = av === null || av === undefined;
      const bMissing = bv === null || bv === undefined;
      if (aMissing && bMissing) return 0;
      if (aMissing) return 1;
      if (bMissing) return -1;
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : Number(av) - Number(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    const total = rows.length;
    const pagedRows = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    return NextResponse.json({ rows: pagedRows, total });
  }

  // Current tab
  const sellReports = await Report.find(
    { publishStatus: 'published', recommendation: 'SELL', pastStockRecommendations: { $exists: true, $ne: [] } },
    { pastStockRecommendations: 1 }
  ).lean() as unknown as Array<{ pastStockRecommendations: Array<{ toString(): string }> }>;

  const soldBuyIds = sellReports.flatMap((r) =>
    (r.pastStockRecommendations || []).map((id) => id.toString())
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbQuery: Record<string, any> = {
    publishStatus: 'published',
    ...notFutureDated(),
    recommendation: { $in: ['BUY', 'SPECULATIVE BUY'] },
    _id: { $nin: soldBuyIds },
  };

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    dbQuery.$or = [
      { ticker: { $regex: escaped, $options: 'i' } },
      { upsellTicker: { $regex: escaped, $options: 'i' } },
    ];
  }

  const dbSortMap: Record<string, Record<string, 1 | -1>> = {
    buyingDate:  { createdAt: sortDir === 'asc' ? 1 : -1 },
    buyingPrice: { price: sortDir === 'asc' ? 1 : -1 },
    ticker:      { ticker: sortDir === 'asc' ? 1 : -1 },
    index:       { upsellTicker: sortDir === 'asc' ? 1 : -1 },
  };
  const dbSort = dbSortMap[sortKey] || { createdAt: -1 };

  const [total, reports] = await Promise.all([
    Report.countDocuments(dbQuery),
    Report.find(dbQuery, { slug: 1, ticker: 1, upsellTicker: 1, price: 1, currentPrice: 1, currentPriceCurrency: 1, createdAt: 1 })
      .sort(dbSort)
      .skip((page - 1) * PER_PAGE)
      .limit(PER_PAGE)
      .lean() as unknown as Promise<Array<{ slug: string; ticker: string; upsellTicker: string; price: number; currentPrice: number; currentPriceCurrency: string; createdAt: Date }>>,
  ]);

  const liveQuotes = await Promise.all(
    reports.map((r) => fetchLiveQuote(r.ticker || '', r.upsellTicker || ''))
  );

  const rows = reports.map((r, i) => {
    const lq = liveQuotes[i];
    const currentPrice = lq?.price ?? (r.currentPrice > 0 ? r.currentPrice : r.price);
    return {
      ticker: r.ticker || r.upsellTicker || '-',
      index: r.upsellTicker || '-',
      buyingDate: formatDate(r.createdAt),
      buyReportSlug: r.slug,
      buyingPrice: Number(r.price || 0),
      currentPrice: Number(currentPrice || 0),
      currency: lq?.currency || r.currentPriceCurrency || '',
      profitLoss: profitLossPercent(Number(r.price), Number(currentPrice)),
    };
  });

  return NextResponse.json({ rows, total, currentPriceLabel: formatDate(new Date()) });
}

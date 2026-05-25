import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Report from '@/models/Report';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        regularMarketPrice?: number;
        previousClose?: number;
        currency?: string;
      };
    }>;
    error?: { description?: string };
  };
};

function yahooSymbol(ticker: string, index: string) {
  const cleanTicker = ticker.trim().toUpperCase();
  if (!cleanTicker || cleanTicker.includes('.')) return cleanTicker;

  switch (index.trim().toUpperCase()) {
    case 'ASX':
      return `${cleanTicker}.AX`;
    default:
      return cleanTicker;
  }
}

async function fetchYahooPrice(symbol: string) {
  const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`, {
    cache: 'no-store',
    headers: {
      accept: 'application/json',
      'user-agent': 'PristineGaze/1.0',
    },
  });

  if (!res.ok) throw new Error(`Yahoo returned ${res.status}`);

  const data = await res.json() as YahooChartResponse;
  const meta = data.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice ?? meta?.previousClose;

  if (typeof price !== 'number' || !Number.isFinite(price)) {
    throw new Error(data.chart?.error?.description || 'Price not found');
  }

  return {
    price,
    currency: meta?.currency || '',
    providerSymbol: meta?.symbol || symbol,
  };
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  const isAuthorized = process.env.NODE_ENV !== 'production' || (!!secret && auth === `Bearer ${secret}`);

  if (!isAuthorized) return errorResponse('Unauthorized', 401);

  await connectDB();
  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';

  const buyReports = await Report.find({
    publishStatus: 'published',
    recommendation: 'BUY',
    ticker: { $ne: '' },
  }).select('title slug ticker upsellTicker').lean();

  const updatedAt = new Date();
  const updated: Array<{ slug: string; ticker: string; symbol: string; price: number; currency: string }> = [];
  const failed: Array<{ slug: string; ticker: string; symbol: string; error: string }> = [];

  for (const report of buyReports) {
    const symbol = yahooSymbol(report.ticker || '', report.upsellTicker || '');
    if (!symbol) continue;

    try {
      const quote = await fetchYahooPrice(symbol);
      if (!dryRun) {
        await Report.updateOne(
          { _id: report._id },
          {
            $set: {
              currentPrice: quote.price,
              currentPriceCurrency: quote.currency,
              currentPriceUpdatedAt: updatedAt,
            },
          }
        );
      }
      updated.push({
        slug: report.slug,
        ticker: report.ticker,
        symbol: quote.providerSymbol,
        price: quote.price,
        currency: quote.currency,
      });
    } catch (error) {
      failed.push({
        slug: report.slug,
        ticker: report.ticker,
        symbol,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return successResponse({
    dryRun,
    updatedAt,
    updatedCount: updated.length,
    failedCount: failed.length,
    updated,
    failed,
  }, dryRun ? 'Stock prices checked' : 'Stock prices refreshed');
}

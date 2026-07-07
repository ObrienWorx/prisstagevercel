import connectDB from '@/lib/mongoose';
import Report from '@/models/Report';
import SiteLayout from '@/components/SiteLayout';
import PastRecommendationsTabs from '@/components/PastRecommendationsTabs';
import { cookies } from 'next/headers';
import { verifySubscriberToken } from '@/lib/subscriberJwt';
import { notFutureDated } from '@/lib/reportVisibility';

export const dynamic = 'force-dynamic';

type PopulatedReport = {
  _id: { toString(): string };
  title: string;
  slug: string;
  upsellTicker?: string;
  ticker?: string;
  price?: number;
  currentPrice?: number;
  currentPriceCurrency?: string;
  currentPriceUpdatedAt?: string | Date | null;
  recommendation?: string;
  createdAt: string | Date;
  pastStockRecommendation?: PopulatedReport | null;
  pastStockRecommendations?: PopulatedReport[];
};

const isBuyReco = (r?: string) => r === 'BUY' || r === 'SPECULATIVE BUY';

type LiveQuote = {
  price: number;
  currency: string;
  updatedAt: Date;
};

export const metadata = {
  title: 'Past Recommendations - PristineGaze',
  description: 'Browse PristineGaze past recommendations and current market trends.',
};

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
  const cleanTicker = ticker.trim().toUpperCase();
  if (!cleanTicker || cleanTicker.includes('.')) return cleanTicker;

  switch (index.trim().toUpperCase()) {
    case 'ASX':
      return `${cleanTicker}.AX`;
    default:
      return cleanTicker;
  }
}

async function fetchLiveQuote(ticker: string, index: string): Promise<LiveQuote | null> {
  const symbol = yahooSymbol(ticker, index);
  if (!symbol || symbol === '-') return null;

  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`, {
      cache: 'no-store',
      headers: {
        accept: 'application/json',
        'user-agent': 'PristineGaze/1.0',
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice ?? meta?.previousClose;

    if (typeof price !== 'number' || !Number.isFinite(price)) return null;

    return {
      price,
      currency: meta?.currency || '',
      updatedAt: new Date(),
    };
  } catch {
    return null;
  }
}

function serializeReport(report: PopulatedReport) {
  return {
    id: report._id.toString(),
    title: report.title,
    slug: report.slug,
    index: report.upsellTicker || '-',
    ticker: report.ticker || report.upsellTicker || '-',
    price: Number(report.price ?? 0),
    currentPrice: Number(report.currentPrice ?? 0),
    currentPriceCurrency: report.currentPriceCurrency || '',
    currentPriceUpdatedAt: report.currentPriceUpdatedAt || null,
    createdAt: report.createdAt,
  };
}

export default async function PastRecommendationsPage() {
  await connectDB();
  const cookieStore = await cookies();
  const token = cookieStore.get('subscriber_token')?.value;
  const isLoggedIn = !!(token && verifySubscriberToken(token));

  const reports = await Report.find({
    publishStatus: 'published',
    ...notFutureDated(),
    recommendation: { $in: ['BUY', 'SELL', 'SPECULATIVE BUY'] },
  })
    .populate('pastStockRecommendations', 'title slug ticker upsellTicker price recommendation createdAt')
    .sort({ createdAt: -1 })
    .lean() as unknown as PopulatedReport[];

  const soldBuyIds = new Set<string>();

  const pastRows = reports
    .filter((report) => report.recommendation === 'SELL' && (report.pastStockRecommendations?.length))
    .flatMap((sellReport) => {
      const sell = serializeReport(sellReport);
      return (sellReport.pastStockRecommendations as PopulatedReport[]).map((buyReport) => {
        const buy = serializeReport(buyReport);
        soldBuyIds.add(buy.id);
        return {
          ticker: buy.ticker,
          index: buy.index,
          buyingDate: formatDate(buy.createdAt),
          buyReportSlug: buy.slug,
          sellingDate: formatDate(sell.createdAt),
          sellReportSlug: sell.slug,
          buyingPrice: buy.price,
          sellingPrice: sell.price,
          profitLoss: profitLossPercent(buy.price, sell.price),
        };
      });
    });

  const currentBuyReports = reports
    .filter((report) => isBuyReco(report.recommendation) && !soldBuyIds.has(report._id.toString()))
    .map((report) => serializeReport(report));

  const liveQuotes = new Map<string, LiveQuote | null>();
  await Promise.all(
    currentBuyReports.map(async (buy) => {
      const symbol = yahooSymbol(buy.ticker, buy.index);
      if (!liveQuotes.has(symbol)) {
        liveQuotes.set(symbol, await fetchLiveQuote(buy.ticker, buy.index));
      }
    })
  );

  const currentRows = currentBuyReports
    .map((buy) => {
      const liveQuote = liveQuotes.get(yahooSymbol(buy.ticker, buy.index));
      const currentPrice = liveQuote?.price ?? (buy.currentPrice > 0 ? buy.currentPrice : buy.price);
      return {
        ticker: buy.ticker,
        index: buy.index,
        buyingDate: formatDate(buy.createdAt),
        buyingPrice: buy.price,
        currentPrice,
        currency: liveQuote?.currency || buy.currentPriceCurrency,
        profitLoss: profitLossPercent(buy.price, currentPrice),
      };
    });

  const latestPriceUpdate = reports
    .map((report) => report.currentPriceUpdatedAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b as string | Date).getTime() - new Date(a as string | Date).getTime())[0];

  const latestLiveUpdate = Array.from(liveQuotes.values())
    .filter((quote): quote is LiveQuote => !!quote)
    .map((quote) => quote.updatedAt)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const currentPriceLabel = latestLiveUpdate
    ? formatDate(latestLiveUpdate)
    : latestPriceUpdate ? formatDate(latestPriceUpdate) : 'latest update';

  return (
    <SiteLayout>
      <div className="video-page-hero text-white">
        <div className="container text-center">
          <h1 className="video-page-title">
            Explore our Past Stock Recommendations
          </h1>
          <p className="video-page-lead mx-auto">A Look Back at Our Best Picks – Helping You Make Smarter Decisions</p>
        </div>
      </div>
      <div className="site-section pg-rec-page">
        <div className="container">
          <PastRecommendationsTabs
            pastRows={pastRows}
            currentRows={currentRows}
            currentPriceLabel={currentPriceLabel}
            isLoggedIn={isLoggedIn}
          />
        </div>
      </div>
    </SiteLayout>
  );
}

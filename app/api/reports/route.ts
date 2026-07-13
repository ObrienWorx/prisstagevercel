import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Report from '@/models/Report';
import Sector from '@/models/Sector';
import '@/models/ReportCategory';
import '@/models/Product';
import { authenticate, requirePermission } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { dateRangeFilter } from '@/lib/dateRange';
import { slugify } from '@/lib/slugify';

export async function GET(req: NextRequest) {
  const { error } = await authenticate(req); if (error) return error;
  try {
    await connectDB();

    const sp = req.nextUrl.searchParams;

    const q = sp.get('q')?.trim();
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      const reports = await Report.find({ $or: [{ title: regex }, { upsellTicker: regex }, { ticker: regex }] })
        .populate('sector', 'name')
        .select('title slug upsellTicker ticker sector recommendation publishStatus')
        .sort({ createdAt: -1 })
        .limit(8);
      return successResponse(reports);
    }

    if (sp.get('distinct')) {
      const [indexes, tickers] = await Promise.all([
        Report.distinct('upsellTicker', { upsellTicker: { $nin: ['', null] } }),
        Report.distinct('ticker', { ticker: { $nin: ['', null] } }),
      ]);
      return successResponse({ indexes: (indexes as string[]).sort(), tickers: (tickers as string[]).sort() });
    }

    if (sp.get('match')) {
      const mIndex = sp.get('index')?.trim().toUpperCase();
      const mTicker = sp.get('ticker')?.trim().toUpperCase();
      if (!mIndex || !mTicker) return successResponse([]);
      const matches = await Report.find({ upsellTicker: mIndex, ticker: mTicker })
        .select('title slug ticker upsellTicker recommendation createdAt')
        .sort({ createdAt: -1 }).limit(200).lean();
      return successResponse(matches);
    }

    const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') ?? '20', 10)));
    const search = sp.get('search')?.trim();
    const category = sp.get('category')?.trim();
    const sector = sp.get('sector')?.trim();
    const product = sp.get('product')?.trim();
    const index = sp.get('index')?.trim();
    const ticker = sp.get('ticker')?.trim();
    const recommendation = sp.get('recommendation')?.trim();
    const dateFrom = sp.get('dateFrom')?.trim();
    const dateTo = sp.get('dateTo')?.trim();
    const filter: Record<string, unknown> = {};
    if (search) filter.title = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (category) filter.category = category;
    if (sector) filter.sector = sector;
    if (product) filter.product = product;
    if (index) filter.upsellTicker = index.toUpperCase();
    if (ticker) filter.ticker = ticker.toUpperCase();
    if (recommendation) filter.$or = [{ recommendations: recommendation }, { recommendation }];
    const createdAt = dateRangeFilter(dateFrom, dateTo);
    if (createdAt) filter.createdAt = createdAt;
    const [items, total] = await Promise.all([
      Report.find(filter)
        .select('-content')
        .populate('category', 'name slug')
        .populate('sector', 'name slug')
        .populate('product', 'name regularPrice salePrice')
        .populate('pastStockRecommendations', 'title slug ticker upsellTicker')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Report.countDocuments(filter),
    ]);
    return successResponse({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    return errorResponse(String(e), 500);
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission(req, 'reports'); if (error) return error;
  await connectDB();
  const { title, slug, content, featuredImage, pdfUrl, category, sector, product, pastStockRecommendation, pastStockRecommendations, upsellTicker, ticker, price, recommendation, recommendations, featured, publishStatus, publishedAt, metaTitle, metaDescription, metaImage } = await req.json();
  if (!title) return errorResponse('Title is required');
  const finalSlug = slug ? slugify(slug) : slugify(title);
  if (await Report.findOne({ slug: finalSlug })) return errorResponse('Slug already exists');
  const recoTags = Array.isArray(recommendations) ? recommendations.filter(Boolean) : (recommendation ? [recommendation] : []);
  const pastBuys = Array.isArray(pastStockRecommendations) ? pastStockRecommendations.filter(Boolean) : (pastStockRecommendation ? [pastStockRecommendation] : []);
  const report = await Report.create({ title, slug: finalSlug, content, featuredImage, pdfUrl: pdfUrl || '', category: category || null, sector: sector || null, product: product || null, pastStockRecommendations: pastBuys, pastStockRecommendation: pastBuys[0] || null, upsellTicker: (upsellTicker || '').trim().toUpperCase(), ticker: (ticker || '').trim().toUpperCase(), price: price ?? 0, recommendation: recoTags[0] || '', recommendations: recoTags, featured: !!featured, publishStatus: publishStatus || 'draft', publishedAt: publishedAt ? new Date(publishedAt) : new Date(), metaTitle, metaDescription, metaImage });
  await report.populate([{ path: 'category', select: 'name slug' }, { path: 'sector', select: 'name slug' }, { path: 'product', select: 'name' }, { path: 'pastStockRecommendations', select: 'title slug ticker upsellTicker' }]);
  return successResponse(report, 'Report created', 201);
}

import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Report from '@/models/Report';
import Sector from '@/models/Sector';
import '@/models/ReportCategory';
import '@/models/Product';
import { authenticate, requirePermission } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { slugify } from '@/lib/slugify';

export async function GET(req: NextRequest) {
  const { error } = await authenticate(req); if (error) return error;
  try {
    await connectDB();

    const sp = req.nextUrl.searchParams;

    const q = sp.get('q')?.trim();
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const matchingSectors = await Sector.find({ name: regex }, '_id');
      const sectorIds = matchingSectors.map((s) => s._id);
      const orClauses: object[] = [{ title: regex }, { upsellTicker: regex }, { ticker: regex }];
      if (sectorIds.length) orClauses.push({ sector: { $in: sectorIds } });
      const reports = await Report.find({ $or: orClauses })
        .populate('sector', 'name')
        .select('title slug upsellTicker ticker sector recommendation publishStatus')
        .sort({ createdAt: -1 })
        .limit(8);
      return successResponse(reports);
    }

    // Lightweight id+title list for picker dropdowns (e.g. "Past Stock Recommendations").
    if (sp.get('titles')) {
      const titles = await Report.find({}, 'title upsellTicker ticker').sort({ createdAt: -1 }).lean();
      return successResponse(titles);
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
    const filter: Record<string, unknown> = {};
    if (search) filter.title = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (category) filter.category = category;
    if (sector) filter.sector = sector;
    if (product) filter.product = product;
    if (index) filter.upsellTicker = index.toUpperCase();
    if (ticker) filter.ticker = ticker.toUpperCase();
    // Match the multi-select tags array, falling back to the legacy single `recommendation` field.
    if (recommendation) filter.$or = [{ recommendations: recommendation }, { recommendation }];
    const [items, total] = await Promise.all([
      Report.find(filter)
        .select('-content') // omit heavy HTML body; fetched on demand via /api/reports/[id]
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
  const { title, slug, content, featuredImage, category, sector, product, pastStockRecommendation, pastStockRecommendations, upsellTicker, ticker, price, recommendation, recommendations, featured, publishStatus, metaTitle, metaDescription, metaImage } = await req.json();
  if (!title) return errorResponse('Title is required');
  const finalSlug = slug ? slugify(slug) : slugify(title);
  if (await Report.findOne({ slug: finalSlug })) return errorResponse('Slug already exists');
  const recoTags = Array.isArray(recommendations) ? recommendations.filter(Boolean) : (recommendation ? [recommendation] : []);
  // A SELL may close several prior buys — keep the singular field synced to the first for back-compat.
  const pastBuys = Array.isArray(pastStockRecommendations) ? pastStockRecommendations.filter(Boolean) : (pastStockRecommendation ? [pastStockRecommendation] : []);
  const report = await Report.create({ title, slug: finalSlug, content, featuredImage, category: category || null, sector: sector || null, product: product || null, pastStockRecommendations: pastBuys, pastStockRecommendation: pastBuys[0] || null, upsellTicker: (upsellTicker || '').trim().toUpperCase(), ticker: (ticker || '').trim().toUpperCase(), price: price ?? 0, recommendation: recoTags[0] || '', recommendations: recoTags, featured: !!featured, publishStatus: publishStatus || 'draft', metaTitle, metaDescription, metaImage });
  await report.populate([{ path: 'category', select: 'name slug' }, { path: 'sector', select: 'name slug' }, { path: 'product', select: 'name' }, { path: 'pastStockRecommendations', select: 'title slug ticker upsellTicker' }]);
  return successResponse(report, 'Report created', 201);
}

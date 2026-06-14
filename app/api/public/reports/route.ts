import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Report from '@/models/Report';
import Sector from '@/models/Sector';
import '@/models/Product';
import '@/models/ReportCategory';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { toReportListItem, LISTING_PER_PAGE } from '@/lib/listItems';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sectorSlug = searchParams.get('sector');
    const categorySlug = searchParams.get('category');
    const productId = searchParams.get('product');
    const q = searchParams.get('q')?.trim();

    await connectDB();

    // Full-text search mode
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const matchingSectors = await Sector.find({ name: regex }, '_id');
      const sectorIds = matchingSectors.map((s) => s._id);
      const orClauses: object[] = [{ title: regex }, { upsellTicker: regex }];
      if (sectorIds.length) orClauses.push({ sector: { $in: sectorIds } });

      const reports = await Report.find({ publishStatus: 'published', $or: orClauses })
        .populate('sector', 'name slug')
        .populate('product', 'name slug')
        .populate('category', 'name slug')
        .sort({ createdAt: -1 })
        .lean();

      const preview = reports.map((r: any) => ({
        _id: r._id,
        title: r.title,
        slug: r.slug,
        featuredImage: r.featuredImage,
        sector: r.sector,
        product: r.product,
        category: r.category,
        upsellTicker: r.upsellTicker,
        recommendation: r.recommendation,
        createdAt: r.createdAt,
        excerpt: r.content ? r.content.replace(/<[^>]+>/g, '').slice(0, 200) + '...' : '',
      }));

      return successResponse(preview);
    }

    const paged = searchParams.has('page');
    const emptyResult = paged ? { items: [], total: 0, page: 1, pages: 0 } : [];

    const filter: Record<string, unknown> = { publishStatus: 'published' };

    if (sectorSlug) {
      const sector = await Sector.findOne({ slug: sectorSlug });
      if (sector) filter.sector = sector._id;
      else return successResponse(emptyResult);
    }

    if (categorySlug) {
      const ReportCategory = (await import('@/models/ReportCategory')).default;
      const cat = await ReportCategory.findOne({ slug: categorySlug, status: 'active' });
      if (cat) filter.category = cat._id;
      else return successResponse(emptyResult);
    }

    if (productId) filter.product = productId;

    // Paginated, shaped output for the public "load more" UI.
    if (paged) {
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.min(48, Math.max(1, parseInt(searchParams.get('limit') || String(LISTING_PER_PAGE), 10)));
      const [docs, total] = await Promise.all([
        Report.find(filter).select('title slug featuredImage createdAt recommendation').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Report.countDocuments(filter),
      ]);
      return successResponse({ items: docs.map(toReportListItem), total, page, pages: Math.ceil(total / limit) });
    }

    const reports = await Report.find(filter)
      .populate('sector', 'name slug')
      .populate('product', 'name slug')
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .lean();

    // Return reports without full content (just preview)
    const preview = reports.map((r: any) => ({
      _id: r._id,
      title: r.title,
      slug: r.slug,
      featuredImage: r.featuredImage,
      sector: r.sector,
      product: r.product,
      category: r.category,
      upsellTicker: r.upsellTicker,
      createdAt: r.createdAt,
      excerpt: r.content ? r.content.replace(/<[^>]+>/g, '').slice(0, 200) + '...' : '',
    }));

    return successResponse(preview);
  } catch (e) {
    return errorResponse(String(e), 500);
  }
}

import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Report from '@/models/Report';
import '@/models/Sector';
import '@/models/Product';
import '@/models/ReportCategory';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sectorSlug = searchParams.get('sector');
    const categorySlug = searchParams.get('category');
    const productId = searchParams.get('product');

    await connectDB();

    const filter: Record<string, unknown> = { publishStatus: 'published' };

    if (sectorSlug) {
      const Sector = (await import('@/models/Sector')).default;
      const sector = await Sector.findOne({ slug: sectorSlug });
      if (sector) filter.sector = sector._id;
    }

    if (categorySlug) {
      const ReportCategory = (await import('@/models/ReportCategory')).default;
      const cat = await ReportCategory.findOne({ slug: categorySlug, status: 'active' });
      if (cat) filter.category = cat._id;
      else return successResponse([]);
    }

    if (productId) filter.product = productId;

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

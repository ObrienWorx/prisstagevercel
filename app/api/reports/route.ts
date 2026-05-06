import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Report from '@/models/Report';
import '@/models/ReportCategory';
import '@/models/Sector';
import '@/models/Product';
import { authenticate, requirePermission } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { slugify } from '@/lib/slugify';

export async function GET(req: NextRequest) {
  const { error } = await authenticate(req); if (error) return error;
  try {
    await connectDB();
    const reports = await Report.find({})
      .populate('category', 'name slug')
      .populate('sector', 'name slug')
      .populate('product', 'name regularPrice salePrice')
      .sort({ createdAt: -1 });
    return successResponse(reports);
  } catch (e) {
    return errorResponse(String(e), 500);
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission(req, 'reports'); if (error) return error;
  await connectDB();
  const { title, slug, content, featuredImage, category, sector, product, upsellTicker, price, recommendation, publishStatus, metaTitle, metaDescription, metaImage } = await req.json();
  if (!title) return errorResponse('Title is required');
  const finalSlug = slug ? slugify(slug) : slugify(title);
  if (await Report.findOne({ slug: finalSlug })) return errorResponse('Slug already exists');
  const report = await Report.create({ title, slug: finalSlug, content, featuredImage, category: category || null, sector: sector || null, product: product || null, upsellTicker, price: price ?? 0, recommendation: recommendation || '', publishStatus: publishStatus || 'draft', metaTitle, metaDescription, metaImage });
  await report.populate([{ path: 'category', select: 'name slug' }, { path: 'sector', select: 'name slug' }, { path: 'product', select: 'name' }]);
  return successResponse(report, 'Report created', 201);
}

import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Report from '@/models/Report';
import { deleteUploadedFile } from '@/lib/deleteUploadedFile';
import '@/models/ReportCategory';
import '@/models/Sector';
import '@/models/Product';
import { authenticate, requirePermission } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { slugify } from '@/lib/slugify';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { error } = await authenticate(req);
  if (error) return error;

  await connectDB();
  const { id } = await params;
  const report = await Report.findById(id)
    .populate('category', 'name slug')
    .populate('sector', 'name slug')
    .populate('product', 'name price')
    .populate('pastStockRecommendation', 'title slug');
  if (!report) return errorResponse('Report not found', 404);
  return successResponse(report);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { error } = await requirePermission(req, 'reports');
  if (error) return error;

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const { title, slug, content, featuredImage, category, sector, product, pastStockRecommendation, upsellTicker, ticker, price, recommendation, recommendations, featured, publishStatus, metaTitle, metaDescription, metaImage } = body;

  const existing = await Report.findById(id);
  if (!existing) return errorResponse('Report not found', 404);

  let finalSlug = existing.slug;
  if (slug) {
    finalSlug = slugify(slug);
    const clash = await Report.findOne({ slug: finalSlug, _id: { $ne: id } });
    if (clash) return errorResponse('A report with this slug already exists');
  }

  const update: Record<string, unknown> = {
    slug: finalSlug,
    ...(title               !== undefined && { title }),
    ...(content             !== undefined && { content }),
    ...(featuredImage       !== undefined && { featuredImage }),
    ...(category            !== undefined && { category: category || null }),
    ...(sector              !== undefined && { sector: sector || null }),
    ...(product             !== undefined && { product: product || null }),
    ...(pastStockRecommendation !== undefined && { pastStockRecommendation: pastStockRecommendation || null }),
    ...(upsellTicker        !== undefined && { upsellTicker: (upsellTicker || '').trim().toUpperCase() }),
    ...(ticker              !== undefined && { ticker: (ticker || '').trim().toUpperCase() }),
    ...(price               !== undefined && { price: Number(price) || 0 }),
    ...(recommendation      !== undefined && { recommendation: recommendation ?? '' }),
    ...(recommendations     !== undefined && {
      recommendations: Array.isArray(recommendations) ? recommendations.filter(Boolean) : [],
      recommendation: (Array.isArray(recommendations) && recommendations.filter(Boolean)[0]) || '',
    }),
    ...(featured            !== undefined && { featured: !!featured }),
    ...(publishStatus       !== undefined && { publishStatus }),
    ...(metaTitle           !== undefined && { metaTitle }),
    ...(metaDescription     !== undefined && { metaDescription }),
    ...(metaImage           !== undefined && { metaImage }),
  };

  const updated = await Report.findByIdAndUpdate(id, { $set: update }, { returnDocument: 'after', runValidators: true })
    .populate('category', 'name slug')
    .populate('sector', 'name slug')
    .populate('product', 'name')
    .populate('pastStockRecommendation', 'title slug');

  return successResponse(updated, 'Report updated successfully');
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { error } = await requirePermission(req, 'reports');
  if (error) return error;

  await connectDB();
  const { id } = await params;
  const report = await Report.findById(id);
  if (!report) return errorResponse('Report not found', 404);

  await deleteUploadedFile(report.featuredImage);
  await report.deleteOne();
  return successResponse(null, 'Report deleted successfully');
}

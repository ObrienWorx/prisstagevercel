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
    .populate('product', 'name price');
  if (!report) return errorResponse('Report not found', 404);
  return successResponse(report);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { error } = await requirePermission(req, 'reports');
  if (error) return error;

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const { title, slug, content, featuredImage, category, sector, product, upsellTicker, publishStatus, metaTitle, metaDescription } = body;

  const report = await Report.findById(id);
  if (!report) return errorResponse('Report not found', 404);

  if (title) report.title = title;
  if (slug) {
    const finalSlug = slugify(slug);
    const existing = await Report.findOne({ slug: finalSlug, _id: { $ne: id } });
    if (existing) return errorResponse('A report with this slug already exists');
    report.slug = finalSlug;
  }
  if (content !== undefined) report.content = content;
  if (featuredImage !== undefined) report.featuredImage = featuredImage;
  if (category !== undefined) report.category = category || null;
  if (sector !== undefined) report.sector = sector || null;
  if (product !== undefined) report.product = product || null;
  if (upsellTicker !== undefined) report.upsellTicker = upsellTicker;
  if (publishStatus) report.publishStatus = publishStatus;
  if (metaTitle !== undefined) report.metaTitle = metaTitle;
  if (metaDescription !== undefined) report.metaDescription = metaDescription;

  await report.save();

  const populated = await report.populate([
    { path: 'category', select: 'name slug' },
    { path: 'sector', select: 'name slug' },
    { path: 'product', select: 'name price' },
  ]);

  return successResponse(populated, 'Report updated successfully');
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

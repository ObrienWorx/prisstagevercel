import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import ReportCategory from '@/models/ReportCategory';
import { authenticate, requirePermission } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { slugify } from '@/lib/slugify';

export async function GET(req: NextRequest) {
  const { error } = await authenticate(req);
  if (error) return error;
  await connectDB();
  const items = await ReportCategory.find({}).sort({ createdAt: -1 });
  return successResponse(items);
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission(req, 'report-categories');
  if (error) return error;
  await connectDB();
  const { name, slug, icon, description, status, metaTitle, metaDescription, metaImage } = await req.json();
  if (!name) return errorResponse('Name is required');
  const finalSlug = slug ? slugify(slug) : slugify(name);
  if (await ReportCategory.findOne({ slug: finalSlug })) return errorResponse('Slug already exists');
  const item = await ReportCategory.create({ name, slug: finalSlug, icon: icon || '', description, status, metaTitle, metaDescription, metaImage });
  return successResponse(item, 'Report category created', 201);
}

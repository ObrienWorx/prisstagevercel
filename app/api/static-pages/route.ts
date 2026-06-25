import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import StaticPage from '@/models/StaticPage';
import { requireAdmin } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;
  await connectDB();
  const pages = await StaticPage.find({}).sort({ sortOrder: 1, createdAt: -1 });
  return successResponse(pages);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;
  await connectDB();
  const body = await req.json();
  if (!body.title || !body.slug) return errorResponse('Title and slug are required');
  const exists = await StaticPage.findOne({ slug: body.slug.toLowerCase() });
  if (exists) return errorResponse('Slug already in use');
  const page = await StaticPage.create({
    title: body.title,
    slug: body.slug.toLowerCase().trim(),
    content: body.content || '',
    metaTitle: body.metaTitle || '',
    metaDescription: body.metaDescription || '',
    isPublished: body.isPublished !== false,
    showInFooter: body.showInFooter || false,
    footerColumn: body.footerColumn || 'none',
  });
  return successResponse(page, 'Page created', 201);
}

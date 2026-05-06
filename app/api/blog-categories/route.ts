import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import BlogCategory from '@/models/BlogCategory';
import { authenticate, requirePermission } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { slugify } from '@/lib/slugify';

export async function GET(req: NextRequest) {
  const { error } = await authenticate(req);
  if (error) return error;
  await connectDB();
  const items = await BlogCategory.find({}).sort({ createdAt: -1 });
  return successResponse(items);
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission(req, 'blog-categories');
  if (error) return error;
  await connectDB();
  const body = await req.json();
  const { name, slug, description, status, showInNav, navHighlight, metaTitle, metaDescription, metaImage } = body;
  if (!name) return errorResponse('Name is required');
  const finalSlug = slug ? slugify(slug) : slugify(name);
  if (await BlogCategory.findOne({ slug: finalSlug })) return errorResponse('Slug already exists');
  const item = await BlogCategory.create({
    name, slug: finalSlug, description, status,
    showInNav: !!showInNav, navHighlight: !!navHighlight,
    metaTitle, metaDescription, metaImage,
  });
  return successResponse(item, 'Blog category created', 201);
}

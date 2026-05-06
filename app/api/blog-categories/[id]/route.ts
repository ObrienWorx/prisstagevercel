import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import BlogCategory from '@/models/BlogCategory';
import { authenticate, requirePermission } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { slugify } from '@/lib/slugify';

type P = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: P) {
  const { error } = await authenticate(req); if (error) return error;
  await connectDB(); const { id } = await params;
  const item = await BlogCategory.findById(id);
  return item ? successResponse(item) : errorResponse('Not found', 404);
}

export async function PUT(req: NextRequest, { params }: P) {
  const { error } = await requirePermission(req, 'blog-categories'); if (error) return error;
  await connectDB(); const { id } = await params;
  const body = await req.json();
  const item = await BlogCategory.findById(id);
  if (!item) return errorResponse('Not found', 404);
  if (body.name) item.name = body.name;
  if (body.slug) {
    const s = slugify(body.slug);
    if (await BlogCategory.findOne({ slug: s, _id: { $ne: id } })) return errorResponse('Slug already exists');
    item.slug = s;
  }
  if (body.description !== undefined) item.description = body.description;
  if (body.status) item.status = body.status;
  if (body.showInNav !== undefined) item.showInNav = !!body.showInNav;
  if (body.navHighlight !== undefined) item.navHighlight = !!body.navHighlight;
  if (body.metaTitle !== undefined) item.metaTitle = body.metaTitle;
  if (body.metaDescription !== undefined) item.metaDescription = body.metaDescription;
  if (body.metaImage !== undefined) item.metaImage = body.metaImage;
  await item.save();
  return successResponse(item, 'Updated');
}

export async function DELETE(req: NextRequest, { params }: P) {
  const { error } = await requirePermission(req, 'blog-categories'); if (error) return error;
  await connectDB(); const { id } = await params;
  const item = await BlogCategory.findById(id);
  if (!item) return errorResponse('Not found', 404);
  await item.deleteOne();
  return successResponse(null, 'Deleted');
}

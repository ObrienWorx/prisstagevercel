import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Category from '@/models/Category';
import { authenticate, requirePermission } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { slugify } from '@/lib/slugify';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { error } = await authenticate(req);
  if (error) return error;

  await connectDB();
  const { id } = await params;
  const category = await Category.findById(id);
  if (!category) return errorResponse('Category not found', 404);
  return successResponse(category);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { error } = await requirePermission(req, 'categories');
  if (error) return error;

  await connectDB();
  const { id } = await params;
  const { name, slug, description, metaTitle, metaDescription } = await req.json();

  const category = await Category.findById(id);
  if (!category) return errorResponse('Category not found', 404);

  if (slug) {
    const finalSlug = slugify(slug);
    const existing = await Category.findOne({ slug: finalSlug, _id: { $ne: id } });
    if (existing) return errorResponse('A category with this slug already exists');
    category.slug = finalSlug;
  }

  if (name) category.name = name;
  if (description !== undefined) category.description = description;
  if (metaTitle !== undefined) category.metaTitle = metaTitle;
  if (metaDescription !== undefined) category.metaDescription = metaDescription;

  await category.save();
  return successResponse(category, 'Category updated successfully');
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { error } = await requirePermission(req, 'categories');
  if (error) return error;

  await connectDB();
  const { id } = await params;
  const category = await Category.findById(id);
  if (!category) return errorResponse('Category not found', 404);

  await category.deleteOne();
  return successResponse(null, 'Category deleted successfully');
}

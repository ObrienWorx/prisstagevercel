import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Category from '@/models/Category';
import { authenticate, requirePermission } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { slugify } from '@/lib/slugify';

export async function GET(req: NextRequest) {
  const { error } = await authenticate(req);
  if (error) return error;

  await connectDB();
  const categories = await Category.find({}).sort({ createdAt: -1 });
  return successResponse(categories);
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission(req, 'categories');
  if (error) return error;

  await connectDB();
  const { name, slug, description, metaTitle, metaDescription } = await req.json();

  if (!name) return errorResponse('Name is required');

  const finalSlug = slug ? slugify(slug) : slugify(name);
  const existing = await Category.findOne({ slug: finalSlug });
  if (existing) return errorResponse('A category with this slug already exists');

  const category = await Category.create({ name, slug: finalSlug, description, metaTitle, metaDescription });
  return successResponse(category, 'Category created successfully', 201);
}

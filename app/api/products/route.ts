import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Product from '@/models/Product';
import { authenticate, requirePermission } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { slugify } from '@/lib/slugify';

export async function GET(req: NextRequest) {
  const { error } = await authenticate(req); if (error) return error;
  await connectDB();
  const products = await Product.find({}).sort({ createdAt: -1 });
  return successResponse(products);
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission(req, 'products'); if (error) return error;
  await connectDB();
  const body = await req.json();
  if (!body.name) return errorResponse('Name is required');
  if (body.regularPrice === undefined) return errorResponse('Regular price is required');
  if (!body.durationValue) return errorResponse('Duration is required');
  const finalSlug = body.slug ? slugify(body.slug) : slugify(body.name);
  if (await Product.findOne({ slug: finalSlug })) return errorResponse('Slug already exists');
  const product = await Product.create({ ...body, slug: finalSlug });
  return successResponse(product, 'Product created', 201);
}

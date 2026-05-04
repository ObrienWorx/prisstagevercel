import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Product from '@/models/Product';
import { authenticate, requirePermission } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { slugify } from '@/lib/slugify';

type P = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: P) {
  const { error } = await authenticate(req); if (error) return error;
  await connectDB(); const { id } = await params;
  const product = await Product.findById(id);
  return product ? successResponse(product) : errorResponse('Not found', 404);
}

export async function PUT(req: NextRequest, { params }: P) {
  const { error } = await requirePermission(req, 'products'); if (error) return error;
  await connectDB(); const { id } = await params;
  const body = await req.json();
  const product = await Product.findById(id);
  if (!product) return errorResponse('Not found', 404);
  if (body.slug) {
    const s = slugify(body.slug);
    if (await Product.findOne({ slug: s, _id: { $ne: id } })) return errorResponse('Slug already exists');
    body.slug = s;
  }
  Object.assign(product, body);
  await product.save();
  return successResponse(product, 'Product updated');
}

export async function DELETE(req: NextRequest, { params }: P) {
  const { error } = await requirePermission(req, 'products'); if (error) return error;
  await connectDB(); const { id } = await params;
  const product = await Product.findById(id);
  if (!product) return errorResponse('Not found', 404);
  await product.deleteOne();
  return successResponse(null, 'Product deleted');
}

import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Product from '@/models/Product';
import { authenticate, requirePermission } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { slugify } from '@/lib/slugify';

export async function GET(req: NextRequest) {
  const { error } = await authenticate(req); if (error) return error;
  await connectDB();
  const products = await Product.find({}).sort({ sortOrder: 1, createdAt: -1 });
  return successResponse(products);
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission(req, 'products'); if (error) return error;
  try {
    await connectDB();
    const body = await req.json();
    if (!body.name) return errorResponse('Name is required');
    if (!body.plans?.length) return errorResponse('At least one plan is required');
    const finalSlug = body.slug ? slugify(body.slug) : slugify(body.name);
    if (await Product.findOne({ slug: finalSlug })) return errorResponse('Slug already exists');
    const last = await Product.findOne({}).sort({ sortOrder: -1 }).select('sortOrder').lean();
    const sortOrder = last ? (last.sortOrder ?? 0) + 1 : 0;
    const product = await Product.create({ ...body, slug: finalSlug, sortOrder });
    return successResponse(product, 'Product created', 201);
  } catch (err: any) {
    console.error('[POST /api/products]', err);
    const msg = err?.errors
      ? Object.values(err.errors).map((e: any) => e.message).join(', ')
      : (err?.message || 'Save failed');
    return errorResponse(msg, 500);
  }
}

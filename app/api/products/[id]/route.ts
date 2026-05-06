import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Product from '@/models/Product';
import { deleteUploadedFiles } from '@/lib/deleteUploadedFile';
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
  try {
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
    // Explicitly mark arrays/subdocs modified so Mongoose detects the change
    product.markModified('plans');
    await product.save();
    return successResponse(product, 'Product updated');
  } catch (err: any) {
    console.error('[PUT /api/products/:id]', err);
    const msg = err?.errors
      ? Object.values(err.errors).map((e: any) => e.message).join(', ')
      : (err?.message || 'Save failed');
    return errorResponse(msg, 500);
  }
}

export async function DELETE(req: NextRequest, { params }: P) {
  const { error } = await requirePermission(req, 'products'); if (error) return error;
  try {
    await connectDB(); const { id } = await params;
    const product = await Product.findById(id);
    if (!product) return errorResponse('Not found', 404);
    await deleteUploadedFiles(product.featuredImage, product.saleBanner);
    await product.deleteOne();
    return successResponse(null, 'Product deleted');
  } catch (err: any) {
    return errorResponse(err?.message || 'Delete failed', 500);
  }
}

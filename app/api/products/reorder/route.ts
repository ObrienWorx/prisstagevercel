import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Product from '@/models/Product';
import { requirePermission } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function PUT(req: NextRequest) {
  const { error } = await requirePermission(req, 'products'); if (error) return error;
  try {
    await connectDB();
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) return errorResponse('ids array is required');

    await Product.bulkWrite(
      ids.map((id: string, index: number) => ({
        updateOne: { filter: { _id: id }, update: { $set: { sortOrder: index } } },
      }))
    );
    return successResponse(null, 'Order updated');
  } catch (err: unknown) {
    console.error('[PUT /api/products/reorder]', err);
    return errorResponse(err instanceof Error ? err.message : 'Reorder failed', 500);
  }
}

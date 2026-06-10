import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import UserProduct from '@/models/UserProduct';
import { requireAdmin } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const subscriberId = searchParams.get('subscriberId');
  const productId = searchParams.get('productId');

  if (!subscriberId || !productId) return errorResponse('subscriberId and productId are required');

  await connectDB();

  const active = await UserProduct.findOne({
    subscriber: subscriberId,
    product: productId,
    isActive: true,
    expiryDate: { $gt: new Date() },
  })
    .sort({ expiryDate: -1 })
    .select('expiryDate')
    .lean() as { expiryDate: Date } | null;

  return successResponse({ active: !!active, expiryDate: active ? active.expiryDate : null });
}

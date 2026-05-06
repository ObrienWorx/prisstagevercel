import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import UserProduct from '@/models/UserProduct';
import { requireAdmin } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { calculateExpiryDate } from '@/lib/orderHelpers';

type P = { params: Promise<{ id: string; upId: string }> };

export async function PUT(req: NextRequest, { params }: P) {
  const { error } = await requireAdmin(req); if (error) return error;
  await connectDB();
  const { id, upId } = await params;

  const up = await UserProduct.findOne({ _id: upId, subscriber: id });
  if (!up) return errorResponse('Assignment not found', 404);

  const { startDate, durationValue, durationType, isActive } = await req.json();

  const start = startDate ? new Date(startDate) : up.startDate;
  const expiry = (durationValue && durationType)
    ? calculateExpiryDate(start, durationType, Number(durationValue))
    : up.expiryDate;

  const updated = await UserProduct.findByIdAndUpdate(
    upId,
    { startDate: start, expiryDate: expiry, ...(isActive !== undefined ? { isActive } : {}) },
    { new: true }
  )
    .populate('product', 'name regularPrice salePrice durationType durationValue')
    .populate('order', 'orderNumber pricePaid paymentStatus');

  return successResponse(updated, 'Updated successfully');
}

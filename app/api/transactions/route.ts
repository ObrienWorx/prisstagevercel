import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Transaction from '@/models/Transaction';
import { requireAdmin } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;
  await connectDB();
  const txns = await Transaction.find({})
    .populate('subscriber', 'name email')
    .populate('product', 'name')
    .populate('order', 'orderNumber')
    .sort({ createdAt: -1 });
  return successResponse(txns);
}

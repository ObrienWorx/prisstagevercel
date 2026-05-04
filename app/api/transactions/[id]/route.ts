import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Transaction from '@/models/Transaction';
import { requireAdmin } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';

type P = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: P) {
  const { error } = await requireAdmin(req); if (error) return error;
  await connectDB(); const { id } = await params;
  const txn = await Transaction.findById(id)
    .populate('subscriber', 'name email')
    .populate('product', 'name')
    .populate('order', 'orderNumber pricePaid orderStatus');
  if (!txn) return errorResponse('Transaction not found', 404);
  return successResponse(txn);
}

export async function PUT(req: NextRequest, { params }: P) {
  const { error } = await requireAdmin(req); if (error) return error;
  await connectDB(); const { id } = await params;
  const { paymentStatus, notes } = await req.json();
  const txn = await Transaction.findById(id);
  if (!txn) return errorResponse('Transaction not found', 404);
  if (paymentStatus) txn.paymentStatus = paymentStatus;
  if (notes !== undefined) txn.notes = notes;
  await txn.save();
  return successResponse(txn, 'Transaction updated');
}

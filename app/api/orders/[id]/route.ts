import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Order from '@/models/Order';
import Transaction from '@/models/Transaction';
import UserProduct from '@/models/UserProduct';
import { requireAdmin } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';

type P = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: P) {
  const { error } = await requireAdmin(req); if (error) return error;
  await connectDB(); const { id } = await params;
  const order = await Order.findById(id)
    .populate('subscriber', 'name email phone')
    .populate('product', 'name regularPrice salePrice durationType durationValue');
  if (!order) return errorResponse('Order not found', 404);
  const transactions = await Transaction.find({ order: id }).sort({ createdAt: -1 });
  return successResponse({ order, transactions });
}

export async function PUT(req: NextRequest, { params }: P) {
  const { error } = await requireAdmin(req); if (error) return error;
  await connectDB();
  const { id } = await params;
  const { paymentStatus, orderStatus, notes } = await req.json();

  const order = await Order.findById(id);
  if (!order) return errorResponse('Order not found', 404);

  // Update order fields
  if (paymentStatus) order.paymentStatus = paymentStatus;
  if (orderStatus) order.orderStatus = orderStatus;
  if (notes !== undefined) order.notes = notes;
  await order.save();

  // Sync transactions with the new payment status
  if (paymentStatus) {
    await Transaction.updateMany({ order: id }, { paymentStatus });
  }

  // Sync UserProduct.isActive based on final order state
  if (order.orderStatus === 'completed') {
    await UserProduct.updateMany({ order: id }, { isActive: true });
  } else if (order.orderStatus === 'cancelled' || order.orderStatus === 'refunded') {
    await UserProduct.updateMany({ order: id }, { isActive: false });
  }

  return successResponse(order, 'Order updated');
}

export async function DELETE(req: NextRequest, { params }: P) {
  const { error } = await requireAdmin(req); if (error) return error;
  await connectDB(); const { id } = await params;
  const order = await Order.findById(id);
  if (!order) return errorResponse('Order not found', 404);
  await Transaction.deleteMany({ order: id });
  await UserProduct.deleteMany({ order: id });
  await order.deleteOne();
  return successResponse(null, 'Order deleted');
}

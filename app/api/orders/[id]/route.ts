import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/mongoose';
import Order from '@/models/Order';
import Product from '@/models/Product';
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
    .populate('product', 'name regularPrice salePrice durationType durationValue')
    .lean() as Record<string, unknown> | null;
  if (!order) return errorResponse('Order not found', 404);

  // Manually populate items.product — handles both ObjectId and legacy string storage
  const rawItems = (order.items as { product: unknown; pricePaid: number; startDate: string; expiryDate: string; durationValue: number; durationType: string }[]) ?? [];
  if (rawItems.length > 0) {
    const objectIds = rawItems.map(item => {
      try { return new Types.ObjectId(String(item.product)); } catch { return null; }
    }).filter((x): x is Types.ObjectId => x !== null);

    const prods = await Product.find({ _id: { $in: objectIds } })
      .select('name regularPrice salePrice durationType durationValue')
      .lean();
    const prodMap = new Map(prods.map(p => [(p._id as Types.ObjectId).toString(), p]));

    order.items = rawItems.map(item => ({
      ...item,
      product: prodMap.get(String(item.product)) ?? null,
    }));
  }

  const transactions = await Transaction.find({ order: id }).sort({ createdAt: -1 }).lean();
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

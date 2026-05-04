import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Transaction from '@/models/Transaction';
import UserProduct from '@/models/UserProduct';
import { requireAdmin } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { calculateExpiryDate } from '@/lib/orderHelpers';

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;
  await connectDB();
  const orders = await Order.find({})
    .populate('subscriber', 'name email')
    .populate('product', 'name regularPrice salePrice durationType durationValue')
    .sort({ createdAt: -1 });
  return successResponse(orders);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;
  await connectDB();

  const { subscriberId, productId, pricePaid, paymentStatus, orderStatus, paymentGateway, startDate, notes } = await req.json();

  if (!subscriberId || !productId) return errorResponse('Subscriber and product are required');

  const product = await Product.findById(productId);
  if (!product) return errorResponse('Product not found');

  const start = startDate ? new Date(startDate) : new Date();
  const expiry = calculateExpiryDate(start, product.durationType, product.durationValue);

  const order = await Order.create({
    subscriber: subscriberId, product: productId,
    pricePaid: pricePaid ?? product.salePrice ?? product.regularPrice,
    paymentStatus: paymentStatus || 'completed',
    orderStatus: orderStatus || 'completed',
    purchaseDate: start, expiryDate: expiry,
    notes: notes || '',
  });

  await Transaction.create({
    order: order._id, subscriber: subscriberId, product: productId,
    amount: order.pricePaid,
    paymentGateway: paymentGateway || 'Manual',
    paymentStatus: order.paymentStatus,
    paymentDate: start,
  });

  await UserProduct.create({
    subscriber: subscriberId, product: productId,
    order: order._id, startDate: start, expiryDate: expiry,
    // Active only when order is completed — pending orders activate when admin marks complete
    isActive: (order.orderStatus === 'completed'),
  });

  const populated = await order.populate([
    { path: 'subscriber', select: 'name email' },
    { path: 'product', select: 'name' },
  ]);

  return successResponse(populated, 'Order created', 201);
}

import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import UserProduct from '@/models/UserProduct';
import Product from '@/models/Product';
import Order from '@/models/Order';
import Transaction from '@/models/Transaction';
import { requireAdmin } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { calculateExpiryDate } from '@/lib/orderHelpers';

type P = { params: Promise<{ id: string }> };

// GET subscriber's products
export async function GET(req: NextRequest, { params }: P) {
  const { error } = await requireAdmin(req); if (error) return error;
  await connectDB(); const { id } = await params;
  const products = await UserProduct.find({ subscriber: id })
    .populate('product', 'name regularPrice salePrice durationType durationValue featuredImage')
    .populate('order', 'orderNumber pricePaid paymentStatus')
    .sort({ createdAt: -1 });
  return successResponse(products);
}

// POST assign product to subscriber (creates Order + Transaction + UserProduct)
export async function POST(req: NextRequest, { params }: P) {
  const { error } = await requireAdmin(req); if (error) return error;
  await connectDB(); const { id } = await params;

  const { productId, pricePaid, paymentGateway, paymentStatus, orderStatus, startDate, notes } = await req.json();

  if (!productId) return errorResponse('Product is required');

  const product = await Product.findById(productId);
  if (!product) return errorResponse('Product not found', 404);

  const start = startDate ? new Date(startDate) : new Date();
  const expiry = calculateExpiryDate(start, product.durationType, product.durationValue);

  // Create Order
  const order = await Order.create({
    subscriber: id, product: productId,
    pricePaid: pricePaid ?? product.salePrice ?? product.regularPrice,
    paymentStatus: paymentStatus || 'completed',
    orderStatus: orderStatus || 'completed',
    purchaseDate: start,
    expiryDate: expiry,
    notes: notes || '',
  });

  // Create Transaction
  await Transaction.create({
    order: order._id, subscriber: id, product: productId,
    amount: order.pricePaid,
    paymentGateway: paymentGateway || 'Manual',
    paymentStatus: order.paymentStatus,
    paymentDate: start,
    notes: notes || '',
  });

  // Create UserProduct access
  const access = await UserProduct.create({
    subscriber: id, product: productId,
    order: order._id, startDate: start, expiryDate: expiry, isActive: true,
  });

  const populated = await access.populate('product', 'name durationType durationValue');
  return successResponse(populated, 'Product assigned successfully', 201);
}

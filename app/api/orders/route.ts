import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
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
    .populate('items.product', 'name')
    .sort({ createdAt: -1 })
    .lean();
  return successResponse(orders);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;
  await connectDB();

  const body = await req.json();
  const { subscriberId, paymentStatus, orderStatus, paymentGateway, notes, sellingPrice } = body;

  if (!subscriberId) return errorResponse('Subscriber is required');

  type RawLine = { productId: string; pricePaid?: number | string; startDate?: string; durationValue?: number | string; durationType?: string };
  const rawLines: RawLine[] = Array.isArray(body.products)
    ? body.products
    : [{ productId: body.productId, pricePaid: body.pricePaid, startDate: body.startDate, durationValue: body.durationValue, durationType: body.durationType }];

  if (rawLines.some(l => !l.productId)) return errorResponse('Product is required');

  const productDocs = await Product.find({ _id: { $in: rawLines.map(l => l.productId) } });
  const pMap = new Map(productDocs.map(p => [p._id.toString(), p]));

  const resolved = rawLines.map(l => {
    const prod = pMap.get(l.productId);
    if (!prod) throw new Error(`Product ${l.productId} not found`);
    const start = l.startDate ? new Date(l.startDate) : new Date();
    const dv = l.durationValue ? Number(l.durationValue) : prod.durationValue;
    const dt = l.durationType || prod.durationType;
    const expiry = calculateExpiryDate(start, dt as 'years' | 'months' | 'days', dv);
    const price = l.pricePaid !== undefined ? Number(l.pricePaid) : (prod.salePrice ?? prod.regularPrice);
    return { prod, productId: l.productId, start, expiry, price, dv, dt };
  });

  const totalPrice = resolved.reduce((s, r) => s + r.price, 0);
  const first = resolved[0];

  const order = await Order.create({
    subscriber: subscriberId,
    product: first.productId,
    pricePaid: totalPrice,
    ...(sellingPrice !== undefined && sellingPrice !== '' && { sellingPrice: Number(sellingPrice) }),
    paymentStatus: paymentStatus || 'completed',
    orderStatus: orderStatus || 'completed',
    purchaseDate: first.start,
    expiryDate: first.expiry,
    notes: notes || '',
  });

  // Set items via raw update — avoids Mongoose 9 subdocument-array cast quirks in create()
  // product must be cast to ObjectId manually since we bypass Mongoose here
  const itemsPayload = resolved.map(r => ({
    product: new Types.ObjectId(r.productId),
    pricePaid: r.price,
    startDate: r.start,
    expiryDate: r.expiry,
    durationValue: r.dv,
    durationType: r.dt,
  }));
  await Order.collection.updateOne({ _id: order._id }, { $set: { items: itemsPayload } });

  for (const r of resolved) {
    await Transaction.create({
      order: order._id, subscriber: subscriberId, product: r.productId,
      amount: r.price,
      paymentGateway: paymentGateway || 'Manual',
      paymentStatus: order.paymentStatus,
      paymentDate: r.start,
    });
    await UserProduct.create({
      subscriber: subscriberId, product: r.productId,
      order: order._id, startDate: r.start, expiryDate: r.expiry,
      isActive: order.orderStatus === 'completed',
    });
  }

  const populated = await Order.findById(order._id)
    .populate('subscriber', 'name email')
    .populate('product', 'name')
    .populate('items.product', 'name');

  return successResponse(populated, 'Order created', 201);
}

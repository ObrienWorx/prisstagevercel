import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/mongoose';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Subscriber from '@/models/Subscriber';
import Transaction from '@/models/Transaction';
import UserProduct from '@/models/UserProduct';
import { requireAdmin } from '@/middleware/authMiddleware';
import { successResponse, errorResponse, paginatedResponse, escapeRegex } from '@/lib/apiResponse';
import { calculateExpiryDate } from '@/lib/orderHelpers';

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;
  await connectDB();

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get('search') || '').trim();
  const pageParam = searchParams.get('page');

  const filter: Record<string, unknown> = {};
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    const [subIds, prodIds] = await Promise.all([
      Subscriber.find({ $or: [{ name: rx }, { email: rx }] }).distinct('_id'),
      Product.find({ name: rx }).distinct('_id'),
    ]);
    filter.$or = [
      { orderNumber: rx },
      { subscriber: { $in: subIds } },
      { product: { $in: prodIds } },
      { 'items.product': { $in: prodIds } },
    ];
  }

  const baseQuery = () => Order.find(filter)
    .populate('subscriber', 'name email')
    .populate('product', 'name regularPrice salePrice durationType durationValue')
    .populate('items.product', 'name')
    // Sort by _id (real insertion time) not createdAt: imported orders carry backdated/
    // future createdAt values, so createdAt would float them above genuinely new orders.
    .sort({ _id: -1 });

  // No page param → full list (legacy callers)
  if (!pageParam) {
    return successResponse(await baseQuery().lean());
  }

  const page = Math.max(1, parseInt(pageParam, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const total = await Order.countDocuments(filter);
  const orders = await baseQuery().skip((page - 1) * limit).limit(limit).lean();
  return paginatedResponse(orders, { total, page, pages: Math.max(1, Math.ceil(total / limit)) });
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

  const now = new Date();
  const resolvedPromises = rawLines.map(async l => {
    const prod = pMap.get(l.productId);
    if (!prod) throw new Error(`Product ${l.productId} not found`);
    let start: Date;
    if (l.startDate) {
      start = new Date(l.startDate);
    } else {
      // Stack after the latest active subscription for this product + subscriber
      const existing = await UserProduct.findOne({
        subscriber: subscriberId,
        product: l.productId,
        isActive: true,
        expiryDate: { $gt: now },
      }).sort({ expiryDate: -1 });
      if (existing) {
        start = new Date(existing.expiryDate);
        start.setDate(start.getDate() + 1);
      } else {
        start = now;
      }
    }
    const dv = l.durationValue ? Number(l.durationValue) : prod.durationValue;
    const dt = l.durationType || prod.durationType;
    const expiry = calculateExpiryDate(start, dt as 'years' | 'months' | 'days', dv);
    const price = l.pricePaid !== undefined ? Number(l.pricePaid) : (prod.salePrice ?? prod.regularPrice);
    return { prod, productId: l.productId, start, expiry, price, dv, dt };
  });
  const resolved = await Promise.all(resolvedPromises);

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

  // Access records — always one per product line.
  for (const r of resolved) {
    await UserProduct.create({
      subscriber: subscriberId, product: r.productId,
      order: order._id, startDate: r.start, expiryDate: r.expiry,
      isActive: order.orderStatus === 'completed',
    });
  }

  // Financials: if an admin Selling Price was set, record ONE transaction for that amount
  // so the selling price is what shows on the order, invoice and transactions. Otherwise
  // record one transaction per product line (the price-paid breakdown).
  const sellAmt = (sellingPrice !== undefined && sellingPrice !== '' && Number(sellingPrice) > 0) ? Number(sellingPrice) : null;
  if (sellAmt !== null) {
    await Transaction.create({
      order: order._id, subscriber: subscriberId, product: first.productId,
      amount: sellAmt,
      paymentGateway: paymentGateway || 'Manual',
      paymentStatus: order.paymentStatus, paymentDate: first.start,
    });
  } else {
    for (const r of resolved) {
      await Transaction.create({
        order: order._id, subscriber: subscriberId, product: r.productId,
        amount: r.price,
        paymentGateway: paymentGateway || 'Manual',
        paymentStatus: order.paymentStatus, paymentDate: r.start,
      });
    }
  }

  const populated = await Order.findById(order._id)
    .populate('subscriber', 'name email')
    .populate('product', 'name')
    .populate('items.product', 'name');

  return successResponse(populated, 'Order created', 201);
}

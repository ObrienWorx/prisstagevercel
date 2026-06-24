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

// POST — assign one or more products, always creates a single Order
export async function POST(req: NextRequest, { params }: P) {
  const { error } = await requireAdmin(req); if (error) return error;
  await connectDB();
  const { id } = await params;
  const body = await req.json();

  const { paymentGateway, paymentStatus, orderStatus, notes } = body;

  type RawLine = { productId: string; pricePaid?: number | string; startDate?: string; durationValue?: number | string; durationType?: string };
  const rawLines: RawLine[] = Array.isArray(body.products) ? body.products : [body as RawLine];

  if (rawLines.some(l => !l.productId)) return errorResponse('Product is required for each line');

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
    subscriber: id,
    product: first.productId,
    pricePaid: totalPrice,
    paymentStatus: paymentStatus || 'completed',
    orderStatus: orderStatus || 'completed',
    purchaseDate: first.start,
    expiryDate: first.expiry,
    notes: notes || '',
    items: resolved.map(r => ({
      product: r.productId,
      pricePaid: r.price,
      startDate: r.start,
      expiryDate: r.expiry,
      durationValue: r.dv,
      durationType: r.dt,
    })),
  });

  const isActive = order.orderStatus === 'completed';
  // Track which products already have a UserProduct on this order to avoid duplicates
  // (a bundled product may also be an explicit line, or be bundled by multiple lines).
  const granted = new Set<string>();

  for (const r of resolved) {
    await UserProduct.create({
      subscriber: id, product: r.productId,
      order: order._id, startDate: r.start, expiryDate: r.expiry,
      isActive,
    });
    granted.add(r.productId);

    await Transaction.create({
      order: order._id, subscriber: id, product: r.productId,
      amount: r.price,
      paymentGateway: paymentGateway || 'Manual',
      paymentStatus: order.paymentStatus,
      paymentDate: r.start,
    });

    // Bundle: grant access to any included products for the SAME period as this line.
    const bundled = (r.prod.bundledProducts ?? [])
      .map((bid) => bid.toString())
      .filter((bid) => bid !== r.productId && !granted.has(bid));
    for (const bundledId of bundled) {
      await UserProduct.create({
        subscriber: id, product: bundledId,
        order: order._id, startDate: r.start, expiryDate: r.expiry,
        isActive,
      });
      granted.add(bundledId);
    }
  }

  return successResponse(
    { orderId: order._id, orderNumber: order.orderNumber, count: resolved.length },
    `${resolved.length} product(s) assigned`,
    201
  );
}

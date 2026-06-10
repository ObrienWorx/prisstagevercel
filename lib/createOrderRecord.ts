import Order from '@/models/Order';
import Transaction from '@/models/Transaction';
import UserProduct from '@/models/UserProduct';
import Product from '@/models/Product';
import { calculateExpiryDate } from './orderHelpers';

interface CreateOrderInput {
  subscriberId: string;
  productId: string;
  pricePaid: number;
  paymentGateway: string;
  paymentStatus: 'pending' | 'completed';
  startDate?: Date;
  notes?: string;
}

export async function createOrderRecord({
  subscriberId, productId, pricePaid, paymentGateway, paymentStatus, startDate, notes,
}: CreateOrderInput) {
  const product = await Product.findById(productId);
  if (!product) throw new Error('Product not found');

  const purchaseDate = new Date();

  let start: Date;
  if (startDate) {
    // Admin explicitly set a start date — respect it
    start = startDate;
  } else {
    // Auto: stack after the latest active subscription for this product
    const existing = await UserProduct.findOne({
      subscriber: subscriberId,
      product: productId,
      isActive: true,
      expiryDate: { $gt: purchaseDate },
    }).sort({ expiryDate: -1 });
    if (existing) {
      // Start the day AFTER the current subscription expires (no overlap)
      start = new Date(existing.expiryDate);
      start.setDate(start.getDate() + 1);
    } else {
      start = purchaseDate;
    }
  }

  const expiry = calculateExpiryDate(start, product.durationType, product.durationValue);
  const orderStatus = paymentStatus === 'completed' ? 'completed' : 'pending';

  const order = await Order.create({
    subscriber: subscriberId,
    product: productId,
    pricePaid,
    paymentStatus,
    orderStatus,
    purchaseDate,
    expiryDate: expiry,
    notes: notes ?? '',
  });

  await Transaction.create({
    order: order._id,
    subscriber: subscriberId,
    product: productId,
    amount: pricePaid,
    paymentGateway,
    paymentStatus,
    paymentDate: purchaseDate,
    notes: notes ?? '',
  });

  await UserProduct.create({
    subscriber: subscriberId,
    product: productId,
    order: order._id,
    startDate: start,
    expiryDate: expiry,
    isActive: paymentStatus === 'completed',
  });

  return order;
}

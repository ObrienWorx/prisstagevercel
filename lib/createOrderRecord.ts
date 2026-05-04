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

  const start = startDate ?? new Date();
  const expiry = calculateExpiryDate(start, product.durationType, product.durationValue);
  const orderStatus = paymentStatus === 'completed' ? 'completed' : 'pending';

  const order = await Order.create({
    subscriber: subscriberId,
    product: productId,
    pricePaid,
    paymentStatus,
    orderStatus,
    purchaseDate: start,
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
    paymentDate: start,
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

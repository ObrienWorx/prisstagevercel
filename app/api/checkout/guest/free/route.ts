import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Product from '@/models/Product';
import Subscriber from '@/models/Subscriber';
import { createOrderRecord } from '@/lib/createOrderRecord';
import { signSubscriberToken } from '@/lib/subscriberJwt';
import { effectivePrice } from '@/lib/effectivePrice';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const { planSlug, saleOffer, email: rawEmail, name: rawName } = await req.json();
  if (!planSlug) return errorResponse('planSlug required');
  const email = (rawEmail || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return errorResponse('A valid email is required');

  await connectDB();
  const product = await Product.findOne({ slug: planSlug, status: 'published', isActive: true });
  if (!product) return errorResponse('Product not found', 404);

  // Only genuinely free products may use this path — price is verified server-side.
  const price = effectivePrice(product, saleOffer === true);
  if (price > 0) return errorResponse('This product is not free', 400);

  try {
    let subscriber = await Subscriber.findOne({ email });
    let isNewAccount = false;
    if (!subscriber) {
      isNewAccount = true;
      const tempPassword = crypto.randomBytes(12).toString('hex');
      subscriber = await Subscriber.create({
        name: (rawName || '').trim() || email.split('@')[0],
        email,
        password: tempPassword,
        plainPassword: tempPassword,
        phone: '',
        isActive: true,
        isEmailVerified: false,
      });
    }

    const order = await createOrderRecord({
      subscriberId: subscriber._id.toString(),
      productId: product._id.toString(),
      pricePaid: 0,
      paymentGateway: 'free',
      paymentStatus: 'completed',
      notes: 'Free product — no payment required',
    });

    const jwtToken = signSubscriberToken({
      subscriberId: subscriber._id.toString(),
      email: subscriber.email,
      name: subscriber.name,
    });

    return successResponse({
      orderNumber: order.orderNumber,
      token: jwtToken,
      isNewAccount,
      subscriber: { name: subscriber.name, email: subscriber.email },
    }, 'Access granted! Your free subscription is active.');
  } catch (e) {
    return errorResponse('Failed to activate: ' + String(e), 500);
  }
}

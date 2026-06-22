import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Product from '@/models/Product';
import { verifySubscriberToken } from '@/lib/subscriberJwt';
import { createOrderRecord } from '@/lib/createOrderRecord';
import { effectivePrice } from '@/lib/effectivePrice';
import { successResponse, errorResponse } from '@/lib/apiResponse';

function getToken(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.substring(7);
  return req.cookies.get('subscriber_token')?.value ?? null;
}

export async function POST(req: NextRequest) {
  const authToken = getToken(req);
  if (!authToken) return errorResponse('Not authenticated', 401);
  const payload = verifySubscriberToken(authToken);
  if (!payload) return errorResponse('Invalid token', 401);

  const { planSlug, saleOffer } = await req.json();
  if (!planSlug) return errorResponse('planSlug required');

  await connectDB();
  const product = await Product.findOne({ slug: planSlug, status: 'published', isActive: true });
  if (!product) return errorResponse('Product not found', 404);

  // Price is computed server-side — only genuinely free products may use this path.
  const price = effectivePrice(product, saleOffer === true);
  if (price > 0) return errorResponse('This product is not free', 400);

  try {
    const order = await createOrderRecord({
      subscriberId: payload.subscriberId,
      productId: product._id.toString(),
      pricePaid: 0,
      paymentGateway: 'free',
      paymentStatus: 'completed',
      notes: 'Free product — no payment required',
    });
    return successResponse({ orderNumber: order.orderNumber }, 'Access granted! Your free subscription is active.');
  } catch (e) {
    return errorResponse('Failed to activate: ' + String(e), 500);
  }
}

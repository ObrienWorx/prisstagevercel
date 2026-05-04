import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Product from '@/models/Product';
import { verifySubscriberToken } from '@/lib/subscriberJwt';
import { createOrderRecord } from '@/lib/createOrderRecord';
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

  const { planSlug } = await req.json();
  if (!planSlug) return errorResponse('planSlug required');

  await connectDB();
  const product = await Product.findOne({ slug: planSlug, status: 'published', isActive: true });
  if (!product) return errorResponse('Product not found', 404);

  try {
    const order = await createOrderRecord({
      subscriberId: payload.subscriberId,
      productId: product._id.toString(),
      pricePaid: (() => {
        const now = new Date();
        const isSaleActive = product.salePrice != null &&
          (!product.saleStartDate || new Date(product.saleStartDate) <= now) &&
          (!product.saleEndDate || new Date(product.saleEndDate) >= now);
        return isSaleActive ? product.salePrice! : product.regularPrice;
      })(),
      paymentGateway: 'cod',
      paymentStatus: 'pending',
      notes: 'Cash on Delivery — awaiting payment confirmation',
    });

    return successResponse(
      { orderNumber: order.orderNumber },
      'Order placed! Your subscription will be activated once payment is confirmed.'
    );
  } catch (e) {
    return errorResponse('Failed to place order: ' + String(e), 500);
  }
}

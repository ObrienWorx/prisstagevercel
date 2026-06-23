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

async function getPayPalToken() {
  const isLive = process.env.PAYPAL_MODE === 'live';
  const base = isLive ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  const creds = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${creds}` },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  return { token: data.access_token as string, base };
}

export async function POST(req: NextRequest) {
  const authToken = getToken(req);
  if (!authToken) return errorResponse('Not authenticated', 401);
  const payload = verifySubscriberToken(authToken);
  if (!payload) return errorResponse('Invalid token', 401);

  const { paypalOrderId, planSlug, saleOffer } = await req.json();
  if (!paypalOrderId || !planSlug) return errorResponse('paypalOrderId and planSlug required');

  await connectDB();
  const product = await Product.findOne({ slug: planSlug, status: 'published', isActive: true });
  if (!product) return errorResponse('Product not found', 404);

  try {
    const { token, base } = await getPayPalToken();
    const res = await fetch(`${base}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (!res.ok || data.status !== 'COMPLETED') {
      return errorResponse('Payment capture failed: ' + (data?.message || data?.status || 'unknown'), 400);
    }

    const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
    const now = new Date();
    const isSaleActive = saleOffer === true && product.salePrice != null &&
      (!product.saleStartDate || new Date(product.saleStartDate) <= now) &&
      (!product.saleEndDate || new Date(product.saleEndDate) >= now);
    const isSaleEnded = saleOffer === true && product.saleEndDate && new Date(product.saleEndDate) < now;
    const fallbackPrice = isSaleActive
      ? product.salePrice!
      : isSaleEnded && product.saleOverPrice != null
        ? product.saleOverPrice
        : product.regularPrice;
    const pricePaid = parseFloat(capture?.amount?.value ?? String(fallbackPrice));

    const order = await createOrderRecord({
      subscriberId: payload.subscriberId,
      productId: product._id.toString(),
      pricePaid,
      paymentGateway: 'paypal',
      paymentStatus: 'completed',
      notes: `PayPal capture ID: ${capture?.id ?? paypalOrderId}`,
    });

    return successResponse({ orderNumber: order.orderNumber }, 'Subscription activated.');
  } catch (e) {
    return errorResponse('Capture failed: ' + String(e), 500);
  }
}

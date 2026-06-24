import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Product from '@/models/Product';
import { verifySubscriberToken } from '@/lib/subscriberJwt';
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
  if (!res.ok || !data.access_token) {
    console.error('PayPal auth failed:', res.status, JSON.stringify(data));
    throw new Error(data?.error_description || data?.error || 'PayPal authentication failed — check PAYPAL_CLIENT_ID/SECRET and PAYPAL_MODE');
  }
  return { token: data.access_token as string, base };
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

  const now = new Date();
  const isSaleActive = saleOffer === true && product.salePrice != null &&
    (!product.saleStartDate || new Date(product.saleStartDate) <= now) &&
    (!product.saleEndDate || new Date(product.saleEndDate) >= now);
  const isSaleEnded = saleOffer === true && product.saleEndDate && new Date(product.saleEndDate) < now;
  const offerPrice = isSaleActive
    ? product.salePrice!
    : isSaleEnded && product.saleOverPrice != null
      ? product.saleOverPrice
      : product.regularPrice;
  const amount = offerPrice.toFixed(2);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const cancelUrl = `${appUrl}/user/checkout?plan=${planSlug}${saleOffer === true ? '&saleOffer=1' : ''}`;

  try {
    const { token, base } = await getPayPalToken();
    const res = await fetch(`${base}/v2/checkout/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{ amount: { currency_code: 'AUD', value: amount }, description: product.name }],
        application_context: {
          return_url: `${appUrl}/user/checkout/success`,
          cancel_url: cancelUrl,
          brand_name: 'PristineGaze',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      // Log the full PayPal payload so the real cause is visible server-side.
      console.error('PayPal create-order failed:', res.status, JSON.stringify(data));
      const issue = data?.details?.[0];
      const detail = issue?.description || issue?.issue || data?.message || data?.name || `PayPal rejected the order (HTTP ${res.status})`;
      const debugId = data?.debug_id ? ` [ref: ${data.debug_id}]` : '';
      return errorResponse(`PayPal: ${detail}${debugId}`, 500);
    }
    if (!data.id) {
      console.error('PayPal create-order returned no id:', JSON.stringify(data));
      return errorResponse('PayPal did not return an order id. Check PayPal credentials/mode.', 500);
    }
    return successResponse({ orderId: data.id });
  } catch (e) {
    console.error('PayPal create-order exception:', e);
    return errorResponse('PayPal request failed: ' + (e instanceof Error ? e.message : String(e)), 500);
  }
}

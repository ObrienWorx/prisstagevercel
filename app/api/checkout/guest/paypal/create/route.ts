import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Product from '@/models/Product';
import { successResponse, errorResponse } from '@/lib/apiResponse';

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
  const { planSlug } = await req.json();
  if (!planSlug) return errorResponse('planSlug required');

  await connectDB();
  const product = await Product.findOne({ slug: planSlug, status: 'published', isActive: true });
  if (!product) return errorResponse('Product not found', 404);

  const now = new Date();
  const isSaleActive = product.salePrice != null &&
    (!product.saleStartDate || new Date(product.saleStartDate) <= now) &&
    (!product.saleEndDate || new Date(product.saleEndDate) >= now);
  const amount = (isSaleActive ? product.salePrice! : product.regularPrice).toFixed(2);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const { token, base } = await getPayPalToken();
    const res = await fetch(`${base}/v2/checkout/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{ amount: { currency_code: 'AUD', value: amount }, description: product.name }],
        application_context: {
          return_url: `${appUrl}/checkout/guest/success`,
          cancel_url: `${appUrl}/checkout/guest?plan=${planSlug}`,
          brand_name: 'PristineGaze',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) return errorResponse(data?.message || 'PayPal error', 500);
    return successResponse({ orderId: data.id });
  } catch (e) {
    return errorResponse('PayPal request failed: ' + String(e), 500);
  }
}

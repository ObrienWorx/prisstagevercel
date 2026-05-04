import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Transaction from '@/models/Transaction';
import '@/models/Product';
import { verifySubscriberToken } from '@/lib/subscriberJwt';
import { successResponse, errorResponse } from '@/lib/apiResponse';

function getToken(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.substring(7);
  return req.cookies.get('subscriber_token')?.value ?? null;
}

export async function GET(req: NextRequest) {
  const token = getToken(req);
  if (!token) return errorResponse('Not authenticated', 401);
  const payload = verifySubscriberToken(token);
  if (!payload) return errorResponse('Invalid token', 401);

  await connectDB();
  const transactions = await Transaction.find({ subscriber: payload.subscriberId })
    .populate('product', 'name slug featuredImage')
    .populate('order', 'orderNumber orderStatus expiryDate')
    .sort({ paymentDate: -1 });

  return successResponse(transactions);
}

import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Order from '@/models/Order';
import { verifySubscriberToken } from '@/lib/subscriberJwt';
import { successResponse, errorResponse } from '@/lib/apiResponse';

function getToken(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.substring(7);
  return req.cookies.get('subscriber_token')?.value ?? null;
}

type P = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: P) {
  const token = getToken(req);
  if (!token) return errorResponse('Not authenticated', 401);
  const payload = verifySubscriberToken(token);
  if (!payload) return errorResponse('Invalid token', 401);
  await connectDB();
  const { id } = await params;
  const order = await Order.findOne({ _id: id, subscriber: payload.subscriberId })
    .populate('items.product', 'name durationValue durationType')
    .populate('product', 'name durationValue durationType');
  if (!order) return errorResponse('Order not found', 404);
  return successResponse(order);
}

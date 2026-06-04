import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/mongoose';
import Subscriber from '@/models/Subscriber';
import ActivityLog from '@/models/ActivityLog';
import UserProduct from '@/models/UserProduct';
import Report from '@/models/Report';
import '@/models/Order';
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
  const subscriber = await Subscriber.findById(payload.subscriberId).select('-password');
  if (!subscriber) return errorResponse('Not found', 404);

  const products = await UserProduct.find({ subscriber: payload.subscriberId })
    .populate('product', 'name slug durationType durationValue featuredImage regularPrice salePrice')
    .populate('order', 'orderNumber pricePaid paymentStatus paymentGateway')
    .sort({ createdAt: -1 });

  const now = new Date();
  const activeProductIds = products
    .filter(up => up.isActive && new Date(up.expiryDate) > now)
    .map(up => (up.product as unknown as { _id: Types.ObjectId })?._id)
    .filter((id): id is Types.ObjectId => id != null);

  const reportCount = await Report.countDocuments({
    publishStatus: 'published',
    $or: [{ product: null }, { product: { $in: activeProductIds } }],
  } as Record<string, unknown>);

  return successResponse({ subscriber, products, reportCount });
}

export async function PUT(req: NextRequest) {
  const token = getToken(req);
  if (!token) return errorResponse('Not authenticated', 401);
  const payload = verifySubscriberToken(token);
  if (!payload) return errorResponse('Invalid token', 401);

  await connectDB();
  const subscriber = await Subscriber.findById(payload.subscriberId);
  if (!subscriber) return errorResponse('Not found', 404);

  const { name, phone, currentPassword, newPassword } = await req.json();

  const changes: Array<{ action: string; field: string; oldValue?: string; newValue?: string }> = [];

  if (name && name !== subscriber.name) changes.push({ action: 'name_updated', field: 'name', oldValue: subscriber.name, newValue: name });
  if (name) subscriber.name = name;

  if (phone !== undefined && phone !== subscriber.phone) changes.push({ action: 'phone_updated', field: 'phone', oldValue: subscriber.phone || '', newValue: phone });
  if (phone !== undefined) subscriber.phone = phone;

  if (newPassword) {
    if (!currentPassword) return errorResponse('Current password required to change password');
    const ok = await subscriber.comparePassword(currentPassword);
    if (!ok) return errorResponse('Current password is incorrect');
    if (newPassword.length < 6) return errorResponse('New password must be at least 6 characters');
    changes.push({ action: 'password_changed', field: 'password', oldValue: subscriber.plainPassword || '—', newValue: newPassword });
    subscriber.password = newPassword;
  }

  await subscriber.save();

  // Force-write plainPassword outside the pre-save hook to guarantee persistence
  if (newPassword) {
    await Subscriber.findByIdAndUpdate(subscriber._id, { $set: { plainPassword: newPassword } });
  }

  if (changes.length > 0) {
    await ActivityLog.insertMany(changes.map(c => ({
      subscriber: subscriber._id,
      ...c,
      performedBy: 'user' as const,
      performedByEmail: subscriber.email,
    })));
  }

  const updated = await Subscriber.findById(subscriber._id).select('-password');
  return successResponse(updated, 'Profile updated');
}

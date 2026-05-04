import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Subscriber from '@/models/Subscriber';
import UserProduct from '@/models/UserProduct';
import { requireAdmin } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';

type P = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: P) {
  const { error } = await requireAdmin(req); if (error) return error;
  await connectDB(); const { id } = await params;
  const sub = await Subscriber.findById(id).select('-password');
  if (!sub) return errorResponse('Subscriber not found', 404);
  const products = await UserProduct.find({ subscriber: id })
    .populate('product', 'name regularPrice salePrice durationType durationValue')
    .populate('order', 'orderNumber pricePaid')
    .sort({ createdAt: -1 });
  return successResponse({ subscriber: sub, products });
}

export async function PUT(req: NextRequest, { params }: P) {
  const { error } = await requireAdmin(req); if (error) return error;
  await connectDB(); const { id } = await params;
  const { name, email, password, phone, isActive } = await req.json();
  const sub = await Subscriber.findById(id);
  if (!sub) return errorResponse('Subscriber not found', 404);
  if (name) sub.name = name;
  if (email) {
    const exists = await Subscriber.findOne({ email: email.toLowerCase(), _id: { $ne: id } });
    if (exists) return errorResponse('Email already in use');
    sub.email = email.toLowerCase().trim();
  }
  if (phone !== undefined) sub.phone = phone;
  if (typeof isActive === 'boolean') sub.isActive = isActive;
  if (password) {
    if (password.length < 6) return errorResponse('Password must be at least 6 characters');
    sub.password = password;
  }
  await sub.save();
  const obj = sub.toObject() as unknown as Record<string, unknown>;
  delete obj.password;
  return successResponse(obj, 'Subscriber updated');
}

export async function DELETE(req: NextRequest, { params }: P) {
  const { error } = await requireAdmin(req); if (error) return error;
  await connectDB(); const { id } = await params;
  const sub = await Subscriber.findById(id);
  if (!sub) return errorResponse('Subscriber not found', 404);
  await sub.deleteOne();
  return successResponse(null, 'Subscriber deleted');
}

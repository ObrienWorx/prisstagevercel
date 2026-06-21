import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongoose';
import Subscriber from '@/models/Subscriber';
import UserProduct from '@/models/UserProduct';
import ActivityLog from '@/models/ActivityLog';
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
  const { error, user } = await requireAdmin(req); if (error) return error;
  await connectDB(); const { id } = await params;
  const { name, email, password, phone, isActive } = await req.json();

  const sub = await Subscriber.findById(id);
  if (!sub) return errorResponse('Subscriber not found', 404);

  const changes: Array<{ action: string; field: string; oldValue?: string; newValue?: string }> = [];
  const update: Record<string, unknown> = {};

  if (name) {
    if (name !== sub.name) changes.push({ action: 'name_updated', field: 'name', oldValue: sub.name, newValue: name });
    update.name = name;
  }
  if (email) {
    const norm = email.toLowerCase().trim();
    const exists = await Subscriber.findOne({ email: norm, _id: { $ne: id } });
    if (exists) return errorResponse('Email already in use');
    if (norm !== sub.email) changes.push({ action: 'email_updated', field: 'email', oldValue: sub.email, newValue: norm });
    update.email = norm;
  }
  if (phone !== undefined) {
    if (phone !== sub.phone) changes.push({ action: 'phone_updated', field: 'phone', oldValue: sub.phone || '', newValue: phone });
    update.phone = phone;
  }
  if (typeof isActive === 'boolean') {
    if (isActive !== sub.isActive) changes.push({ action: 'status_changed', field: 'status', oldValue: sub.isActive ? 'active' : 'inactive', newValue: isActive ? 'active' : 'inactive' });
    update.isActive = isActive;
  }
  if (password) {
    if (password.length < 6) return errorResponse('Password must be at least 6 characters');
    changes.push({ action: 'password_changed', field: 'password', oldValue: sub.plainPassword || '—', newValue: password });
    const salt = await bcrypt.genSalt(12);
    update.password = await bcrypt.hash(password, salt);
    update.plainPassword = password;
  }

  const updated = await Subscriber.findByIdAndUpdate(id, { $set: update }, { returnDocument: 'after' }).select('-password');

  if (changes.length > 0) {
    await ActivityLog.insertMany(changes.map(c => ({
      subscriber: id,
      ...c,
      performedBy: 'admin' as const,
      performedByEmail: user!.email,
    })));
  }

  return successResponse(updated, 'Subscriber updated');
}

export async function DELETE(req: NextRequest, { params }: P) {
  const { error } = await requireAdmin(req); if (error) return error;
  await connectDB(); const { id } = await params;
  const sub = await Subscriber.findById(id);
  if (!sub) return errorResponse('Subscriber not found', 404);
  await sub.deleteOne();
  return successResponse(null, 'Subscriber deleted');
}

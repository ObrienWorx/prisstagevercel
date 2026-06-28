import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import { requireAdmin } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  await connectDB();
  const { id } = await params;
  const user = await User.findById(id).select('-password');

  if (!user) return errorResponse('User not found', 404);
  return successResponse(user);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { user: admin, error } = await requireAdmin(req);
  if (error) return error;

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const { name, email, password, role, permissions, isActive } = body;

  const user = await User.findById(id);
  if (!user) return errorResponse('User not found', 404);

  if (user.role === 'admin' && role === 'sub-admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      return errorResponse('Cannot demote the only admin account');
    }
  }

  if (name) user.name = name.trim();
  if (email) user.email = email.toLowerCase().trim();
  if (typeof isActive === 'boolean') user.isActive = isActive;
  if (role) user.role = role;
  if (permissions) user.permissions = permissions;
  if (password) {
    if (password.length < 6) return errorResponse('Password must be at least 6 characters');
    user.password = password;
  }

  await user.save();

  const userObj = user.toObject();
  delete (userObj as unknown as Record<string, unknown>).password;

  return successResponse(userObj, 'User updated successfully');
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { user: admin, error } = await requireAdmin(req);
  if (error) return error;

  await connectDB();
  const { id } = await params;
  const user = await User.findById(id);

  if (!user) return errorResponse('User not found', 404);

  if (user.role === 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      return errorResponse('Cannot delete the only admin account');
    }
  }

  await user.deleteOne();
  return successResponse(null, 'User deleted successfully');
}

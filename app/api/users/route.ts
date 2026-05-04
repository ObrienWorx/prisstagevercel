import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import { requireAdmin } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  await connectDB();
  const users = await User.find({}).select('-password').sort({ createdAt: -1 });
  return successResponse(users);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  await connectDB();

  const { name, email, password, role, permissions } = await req.json();

  if (!name || !email || !password) {
    return errorResponse('name, email, and password are required');
  }

  if (password.length < 6) {
    return errorResponse('Password must be at least 6 characters');
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return errorResponse('A user with this email already exists');
  }

  const newUser = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    role: role || 'sub-admin',
    permissions: permissions || [],
  });

  const userObj = newUser.toObject();
  delete (userObj as unknown as Record<string, unknown>).password;

  return successResponse(userObj, 'User created successfully', 201);
}

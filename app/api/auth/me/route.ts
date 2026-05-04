// app/api/auth/me/route.ts
// GET /api/auth/me — Returns current logged-in user info

import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import { authenticate } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await authenticate(req);
    if (error) return error;

    await connectDB();

    // Fetch fresh user data from DB (minus password)
    const dbUser = await User.findById(user!.userId).select('-password');

    if (!dbUser) {
      return errorResponse('User not found', 404);
    }

    return successResponse({
      id: dbUser._id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      permissions: dbUser.permissions,
      isActive: dbUser.isActive,
    });
  } catch (error) {
    console.error('Me error:', error);
    return errorResponse('Server error', 500);
  }
}
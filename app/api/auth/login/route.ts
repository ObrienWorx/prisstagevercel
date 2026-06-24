// app/api/auth/login/route.ts
// POST /api/auth/login — Authenticates user and returns JWT

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import { signToken } from '@/lib/jwt';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { email, password } = body;

    // Basic validation
    if (!email || !password) {
      return errorResponse('Email and password are required');
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return errorResponse('Invalid email or password', 401);
    }

    // Check if account is active
    if (!user.isActive) {
      return errorResponse('Your account has been deactivated. Contact admin.', 403);
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse('Invalid email or password', 401);
    }

    // Create JWT token
    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    });

    // Send response with token in cookie (more secure) + body
    const response = successResponse(
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
        },
        token, // Also send in body for API clients
      },
      'Login successful'
    );

    // Set HTTP-only cookie (can't be accessed by JS — more secure)
    const res = NextResponse.json(
      { success: true, message: 'Login successful', data: { token, user: { id: user._id, name: user.name, email: user.email, role: user.role, permissions: user.permissions } } },
      { status: 200 }
    );

    res.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
      path: '/',
    });

    return res;
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('Server error. Please try again.', 500);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import { signToken } from '@/lib/jwt';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { verifyRecaptcha } from '@/lib/recaptcha';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { email, password, recaptchaToken } = body;

    const captcha = await verifyRecaptcha(recaptchaToken, 'admin_login');
    if (!captcha.ok) return errorResponse(captcha.reason || 'Captcha verification failed', 400);

    if (!email || !password) {
      return errorResponse('Email and password are required');
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return errorResponse('Invalid email or password', 401);
    }

    if (!user.isActive) {
      return errorResponse('Your account has been deactivated. Contact admin.', 403);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse('Invalid email or password', 401);
    }

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    });

    const response = successResponse(
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
        },
        token,
      },
      'Login successful'
    );

    const res = NextResponse.json(
      { success: true, message: 'Login successful', data: { token, user: { id: user._id, name: user.name, email: user.email, role: user.role, permissions: user.permissions } } },
      { status: 200 }
    );

    res.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return res;
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('Server error. Please try again.', 500);
  }
}
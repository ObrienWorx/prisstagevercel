// app/api/auth/seed/route.ts
// POST /api/auth/seed — Creates the first admin user (run once, then disable)
// ⚠️ DELETE THIS FILE or add IP restriction in production!

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'name, email, and password are required.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    const existingAdmin = await User.findOne({ role: 'admin' });

    if (existingAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin already exists. Seed not needed.' },
        { status: 400 }
      );
    }

    const admin = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password,
      role: 'admin',
      permissions: ['reports', 'blogs', 'categories', 'sectors', 'products', 'users'],
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      message: '✅ Admin user created successfully!',
      data: {
        name: admin.name,
        email: admin.email,
        role: admin.role,
        note: '⚠️ Please delete /app/api/auth/seed/route.ts after first use!',
      },
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ success: false, error: 'Seed failed', detail: String(error) }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import BlogCategory from '@/models/BlogCategory';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    const cats = await BlogCategory.find({ status: 'active', showInNav: true })
      .select('name slug navHighlight')
      .sort({ createdAt: 1 })
      .lean();

    const data = cats.map((c: any) => ({
      _id: c.slug,
      label: c.name,
      navHighlight: c.navHighlight ?? false,
      count: 0,
    }));

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: true, data: [] });
  }
}

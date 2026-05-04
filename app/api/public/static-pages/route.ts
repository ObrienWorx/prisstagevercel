import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import StaticPage from '@/models/StaticPage';

export async function GET() {
  await connectDB();
  const pages = await StaticPage.find({ isPublished: true, showInFooter: true })
    .select('title slug footerColumn')
    .sort({ title: 1 });
  return NextResponse.json({ success: true, data: pages });
}

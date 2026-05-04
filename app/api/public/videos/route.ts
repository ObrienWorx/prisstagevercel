import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Video from '@/models/Video';

export async function GET() {
  try {
    await connectDB();
    const videos = await Video.find({ isActive: true }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: videos });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

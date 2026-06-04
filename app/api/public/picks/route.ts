import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Pick from '@/models/Pick';

export async function GET() {
  await connectDB();
  const picks = await Pick.find({ isActive: true })
    .select('convictionLevel potentialReturn capType displayOrder')
    .sort({ displayOrder: 1, createdAt: -1 });
  return NextResponse.json({ success: true, data: picks });
}

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Product from '@/models/Product';

type P = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: P) {
  try {
    await connectDB();
    const { slug } = await params;
    const product = await Product.findOne({ slug, status: 'published', isActive: true });
    if (!product) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: product });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

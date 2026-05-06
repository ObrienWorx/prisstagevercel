import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Product from '@/models/Product';

export async function GET() {
  try {
    await connectDB();
    const products = await Product.find({ status: 'published', isActive: true })
      .select('name slug regularPrice salePrice saleStartDate saleEndDate riskRating durationType durationValue plans shortDescription features featuredImage saleBanner')
      .sort({ regularPrice: 1 });
    return NextResponse.json({ success: true, data: products });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

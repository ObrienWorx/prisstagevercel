import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Product from '@/models/Product';

export async function GET() {
  try {
    await connectDB();
    const now = new Date();
    const products = await Product.find({
      status: 'published',
      isActive: true,
      showOnFrontend: { $ne: false },
      salePrice: { $ne: null },
      $or: [{ saleStartDate: null }, { saleStartDate: { $lte: now } }],
      $and: [{ $or: [{ saleEndDate: null }, { saleEndDate: { $gte: now } }] }],
    })
      .select('name slug featuredImage saleBanner salePrice regularPrice saleEndDate plans memberSale')
      .sort({ sortOrder: 1 })
      .lean();
    return NextResponse.json({ success: true, data: products });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

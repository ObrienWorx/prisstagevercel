import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Product from '@/models/Product';

export async function GET(req: NextRequest) {
  const memberOnly = req.nextUrl.searchParams.get('memberOnly') === 'true';

  try {
    await connectDB();
    const now = new Date();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {
      status: 'published',
      isActive: true,
      showOnFrontend: { $ne: false },
      salePrice: { $ne: null },
      $or: [{ saleStartDate: null }, { saleStartDate: { $lte: now } }],
      $and: [{ $or: [{ saleEndDate: null }, { saleEndDate: { $gte: now } }] }],
      // report/sector/category pages pass memberOnly=true → only show memberSale products
      // blog pages pass memberOnly=false (default) → only show non-memberSale products
      memberSale: memberOnly ? true : { $ne: true },
    };

    const products = await Product.find(query)
      .select('name slug featuredImage saleBanner salePrice regularPrice saleEndDate plans memberSale')
      .sort({ sortOrder: 1 })
      .lean();

    return NextResponse.json({ success: true, data: products });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

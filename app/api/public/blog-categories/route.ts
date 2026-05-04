import connectDB from '@/lib/mongoose';
import BlogCategory from '@/models/BlogCategory';
import Blog from '@/models/Blog';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    const cats = await BlogCategory.find({ status: 'active' }).select('name slug').sort({ name: 1 }).lean();
    const withCounts = await Promise.all(
      cats.map(async (c) => {
        const count = await Blog.countDocuments({ category: c._id, publishStatus: 'published' });
        return { ...c, count };
      })
    );
    return successResponse(withCounts.filter(c => c.count > 0));
  } catch (e) {
    return errorResponse(String(e), 500);
  }
}

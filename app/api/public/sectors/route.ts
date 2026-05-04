import connectDB from '@/lib/mongoose';
import Sector from '@/models/Sector';
import Report from '@/models/Report';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    const sectors = await Sector.find({}).select('name slug featuredImage description').sort({ name: 1 }).lean();

    // Add report count per sector
    const withCounts = await Promise.all(
      sectors.map(async (s) => {
        const count = await Report.countDocuments({ sector: s._id, publishStatus: 'published' });
        return { ...s, reportCount: count };
      })
    );

    return successResponse(withCounts.filter(s => s.reportCount > 0));
  } catch (e) {
    return errorResponse(String(e), 500);
  }
}

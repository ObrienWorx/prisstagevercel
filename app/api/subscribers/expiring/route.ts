import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import UserProduct from '@/models/UserProduct';
import '@/models/Subscriber';
import '@/models/Product';
import { requireAdmin } from '@/middleware/authMiddleware';
import { paginatedResponse, escapeRegex } from '@/lib/apiResponse';

const PER_PAGE = 20;

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;
  await connectDB();

  const { searchParams } = new URL(req.url);
  const page   = Math.max(1, parseInt(searchParams.get('page')  || '1', 10));
  const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || String(PER_PAGE), 10)));
  const filter = searchParams.get('filter') || 'all'; // all | soon | expired
  const search = (searchParams.get('search') || '').trim();

  const now = new Date();
  const oneMonthLater = new Date(now);
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

  let dateMatch: Record<string, unknown>;
  if (filter === 'soon')         dateMatch = { expiryDate: { $gt: now, $lte: oneMonthLater } };
  else if (filter === 'expired') dateMatch = { expiryDate: { $lte: now } };
  else                           dateMatch = { expiryDate: { $lte: oneMonthLater } };

  const pipeline: object[] = [
    { $match: dateMatch },
    {
      $lookup: {
        from: 'subscribers',
        localField: 'subscriber',
        foreignField: '_id',
        as: 'subscriberArr',
      },
    },
    { $unwind: '$subscriberArr' },
    {
      $addFields: {
        subscriber: {
          _id:      '$subscriberArr._id',
          name:     '$subscriberArr.name',
          email:    '$subscriberArr.email',
          phone:    '$subscriberArr.phone',
          isActive: '$subscriberArr.isActive',
        },
      },
    },
    { $unset: 'subscriberArr' },
    {
      $lookup: {
        from: 'products',
        localField: 'product',
        foreignField: '_id',
        as: 'productArr',
      },
    },
    { $unwind: { path: '$productArr', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        product: { _id: '$productArr._id', name: '$productArr.name' },
      },
    },
    { $unset: 'productArr' },
  ];

  if (search) {
    const rx = escapeRegex(search);
    pipeline.push({
      $match: {
        $or: [
          { 'subscriber.name':  { $regex: rx, $options: 'i' } },
          { 'subscriber.email': { $regex: rx, $options: 'i' } },
          { 'subscriber.phone': { $regex: rx, $options: 'i' } },
        ],
      },
    });
  }

  // expired records descending (most recent first), soon ascending (soonest first)
  const sortDir = filter === 'expired' ? -1 : 1;
  pipeline.push({ $sort: { expiryDate: sortDir } });

  const countResult = await UserProduct.aggregate([...pipeline, { $count: 'total' }]);
  const total = countResult[0]?.total ?? 0;

  pipeline.push({ $skip: (page - 1) * limit }, { $limit: limit });
  const data = await UserProduct.aggregate(pipeline);

  return paginatedResponse(data, { total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}

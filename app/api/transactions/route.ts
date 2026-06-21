import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Transaction from '@/models/Transaction';
import Order from '@/models/Order';
import Subscriber from '@/models/Subscriber';
import Product from '@/models/Product';
import { requireAdmin } from '@/middleware/authMiddleware';
import { successResponse, errorResponse, paginatedResponse, escapeRegex } from '@/lib/apiResponse';

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim();
    const status = (searchParams.get('status') || 'all').trim();
    const pageParam = searchParams.get('page');

    // search filter (does NOT include status, so tab counts reflect the search)
    const searchFilter: Record<string, unknown> = {};
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      const [subIds, prodIds, orderIds] = await Promise.all([
        Subscriber.find({ $or: [{ name: rx }, { email: rx }] }).distinct('_id'),
        Product.find({ name: rx }).distinct('_id'),
        Order.find({ orderNumber: rx }).distinct('_id'),
      ]);
      searchFilter.$or = [
        { transactionNumber: rx },
        { subscriber: { $in: subIds } },
        { product: { $in: prodIds } },
        { order: { $in: orderIds } },
      ];
    }

    const baseQuery = (f: Record<string, unknown>) => Transaction.find(f)
      .populate('subscriber', 'name email')
      .populate('product', 'name')
      .populate('order', 'orderNumber')
      .sort({ createdAt: -1 });

    // No page param → full list (legacy callers)
    if (!pageParam) {
      return successResponse(await baseQuery(searchFilter));
    }

    const queryFilter = status !== 'all' ? { ...searchFilter, paymentStatus: status } : searchFilter;
    const page = Math.max(1, parseInt(pageParam, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    const [total, txns, countsAgg, completedAgg] = await Promise.all([
      Transaction.countDocuments(queryFilter),
      baseQuery(queryFilter).skip((page - 1) * limit).limit(limit),
      Transaction.aggregate([{ $match: searchFilter }, { $group: { _id: '$paymentStatus', n: { $sum: 1 } } }]),
      Transaction.aggregate([{ $match: { ...searchFilter, paymentStatus: 'completed' } }, { $group: { _id: null, sum: { $sum: '$amount' } } }]),
    ]);

    const statusCounts = { completed: 0, pending: 0, failed: 0, refunded: 0 } as Record<string, number>;
    let all = 0;
    for (const c of countsAgg) { statusCounts[c._id] = c.n; all += c.n; }

    return paginatedResponse(txns, {
      total, page, pages: Math.max(1, Math.ceil(total / limit)),
      statusCounts: { ...statusCounts, all },
      completedTotal: completedAgg[0]?.sum || 0,
    });
  } catch (err) {
    console.error('[GET /api/transactions]', err);
    return errorResponse('Failed to fetch transactions', 500);
  }
}

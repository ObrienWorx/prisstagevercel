import connectDB from '@/lib/mongoose';
import Report from '@/models/Report';
import Product from '@/models/Product';
import UserProduct from '@/models/UserProduct';
import '@/models/Sector';
import '@/models/ReportCategory';
import SiteLayout from '@/components/SiteLayout';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { verifySubscriberToken } from '@/lib/subscriberJwt';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const { product } = await searchParams;
  if (product) {
    await connectDB();
    const p = await Product.findOne({ slug: product }).lean() as any;
    if (p) return { title: `${p.name} Reports – PristineGaze` };
  }
  return { title: 'Research Reports – PristineGaze' };
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const { product: productSlug } = await searchParams;

  await connectDB();

  let filterProduct: any = null;
  let hasAccess = false;
  let isLoggedIn = false;
  let unlockedProductIds: string[] = [];

  if (productSlug) {
    filterProduct = await Product.findOne({ slug: productSlug, isActive: true }).lean() as any;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('subscriber_token')?.value;
  if (token) {
    const payload = verifySubscriberToken(token);
    if (payload) {
      isLoggedIn = true;
      const activeProducts = await UserProduct.find({
        subscriber: payload.subscriberId,
        isActive: true,
        expiryDate: { $gt: new Date() },
      }).select('product').lean();
      unlockedProductIds = activeProducts.map((up: any) => String(up.product));
      if (filterProduct) {
        hasAccess = unlockedProductIds.includes(String(filterProduct._id));
      } else {
        hasAccess = unlockedProductIds.length > 0;
      }
    }
  }

  const filter: Record<string, unknown> = { publishStatus: 'published' };
  if (filterProduct) {
    filter.product = filterProduct._id;
  } else {
    filter.featured = true;
  }

  const reports = await Report.find(filter)
    .select('title slug featuredImage ticker recommendation category sector product featured createdAt publishedAt content')
    .populate('sector', 'name slug')
    .populate('product', 'name slug')
    .populate('category', 'name')
    .sort({ createdAt: -1 })
    .lean() as any[];

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Australia/Sydney' });

  const REC_BADGE: Record<string, string> = {
    BUY: 'text-bg-success', HOLD: 'text-bg-warning', SELL: 'text-bg-danger',
    'SPECULATIVE BUY': 'text-bg-primary', REFRAIN: 'text-bg-secondary',
  };

  return (
    <SiteLayout>
      <section className="cl-hero text-white py-5">
        <div className="container">
          {filterProduct ? (
            <>
              <div className="text-uppercase small text-white-50 mb-2">
                <Link href="/reports" className="link-info text-decoration-none">All Reports</Link> › {filterProduct.name}
              </div>
              <h1 className="h2 fw-bold mb-2">{filterProduct.name}</h1>
              <p className="text-white-50 mb-0">
                {reports.length} report{reports.length !== 1 ? 's' : ''} in this package
              </p>
            </>
          ) : (
            <>
              <h1 className="h2 fw-bold mb-2">Research Reports</h1>
              <p className="text-white-50 mb-0">Expert stock analysis and investment recommendations</p>
            </>
          )}
        </div>
      </section>

      <div className="container py-5">
        {filterProduct && !hasAccess && (
          <div className="alert alert-warning d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div>
              <div className="fw-bold">🔒 Subscription required</div>
              <div className="small mb-0">Subscribe to <strong>{filterProduct.name}</strong> to read full reports.</div>
            </div>
            <Link href={`/subscribe/${filterProduct.slug}`} className="btn btn-primary btn-sm fw-bold text-nowrap">
              Subscribe Now
            </Link>
          </div>
        )}

        {reports.length === 0 ? (
          <div className="text-center text-muted py-5">
            <div className="display-5 mb-3">📭</div>
            <p className="fw-semibold mb-0">No reports published yet.</p>
          </div>
        ) : (
          <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-4">
            {reports.map((r: any) => {
              const reportProductId = r.product ? String(r.product._id) : null;
              const isUnlocked = r.featured || !reportProductId || unlockedProductIds.includes(reportProductId);
              const excerpt = r.content ? r.content.replace(/<[^>]+>/g, '').slice(0, 140) + '…' : '';

              return (
                <div className="col" key={String(r._id)}>
                  <div className="card h-100 shadow-sm">
                    <div className="ratio ratio-16x9 bg-light position-relative">
                      {r.featuredImage ? (
                        <img
                          src={r.featuredImage}
                          alt={r.title}
                          className={`w-100 h-100 object-fit-cover${isUnlocked ? '' : ' report-blur'}`}
                        />
                      ) : (
                        <div className="d-flex align-items-center justify-content-center text-muted fs-1">📄</div>
                      )}
                      {!isUnlocked && (
                        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50">
                          <span className="fs-2">🔒</span>
                        </div>
                      )}
                      {r.recommendation && (
                        <span className={`badge position-absolute top-0 start-0 m-2 ${REC_BADGE[r.recommendation] || 'text-bg-secondary'}`}>
                          {r.recommendation}
                        </span>
                      )}
                    </div>

                    <div className="card-body d-flex flex-column">
                      <div className="d-flex flex-wrap gap-1 mb-2">
                        {r.sector && <span className="badge bg-primary-subtle text-primary-emphasis fw-semibold">{r.sector.name}</span>}
                        {r.ticker && <span className="badge bg-success-subtle text-success-emphasis fw-bold font-monospace">{r.ticker}</span>}
                      </div>
                      <h3 className={`h6 fw-bold mb-2${isUnlocked ? '' : ' report-blur'}`}>{r.title}</h3>
                      {excerpt && (
                        <p className={`small text-muted flex-grow-1${isUnlocked ? '' : ' report-blur'}`}>{excerpt}</p>
                      )}
                      <div className="d-flex align-items-center justify-content-between mt-auto">
                        <span className="small text-muted">{fmtDate(r.publishedAt ?? r.createdAt)}</span>
                        {isUnlocked ? (
                          <Link href={`/reports/${r.slug}`} className="btn btn-primary btn-sm fw-bold">
                            Read Report →
                          </Link>
                        ) : (
                          <Link href={r.product ? `/subscribe/${r.product.slug}` : '/subscribe'} className="btn btn-outline-secondary btn-sm fw-bold">
                            🔒 Subscribe
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

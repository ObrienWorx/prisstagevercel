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

  // Resolve product filter
  let filterProduct: any = null;
  let hasAccess = false;
  let isLoggedIn = false;
  let unlockedProductIds: string[] = [];

  if (productSlug) {
    filterProduct = await Product.findOne({ slug: productSlug, isActive: true }).lean() as any;
  }

  // Check subscriber access
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

  // Fetch reports
  const filter: Record<string, unknown> = { publishStatus: 'published' };
  if (filterProduct) filter.product = filterProduct._id;

  const reports = await Report.find(filter)
    .select('title slug featuredImage ticker recommendation category sector product createdAt content')
    .populate('sector', 'name slug')
    .populate('product', 'name slug')
    .populate('category', 'name')
    .sort({ createdAt: -1 })
    .lean() as any[];

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

  const REC_COLORS: Record<string, string> = {
    BUY: '#16a34a', HOLD: '#f59e0b', SELL: '#ef4444',
    'SPECULATIVE BUY': '#8b5cf6', REFRAIN: '#6b7280',
  };

  return (
    <SiteLayout>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', color: '#fff', padding: '3.5rem 0 2.5rem' }}>
        <div className="container">
          <div style={{ maxWidth: 700 }}>
            {filterProduct ? (
              <>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                  <Link href="/reports" style={{ color: '#60a5fa' }}>All Reports</Link> › {filterProduct.name}
                </div>
                <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800, margin: 0 }}>{filterProduct.name}</h1>
                <p style={{ color: '#94a3b8', marginTop: '0.6rem', marginBottom: 0 }}>
                  {reports.length} report{reports.length !== 1 ? 's' : ''} in this package
                </p>
              </>
            ) : (
              <>
                <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800, margin: 0 }}>Research Reports</h1>
                <p style={{ color: '#94a3b8', marginTop: '0.6rem', marginBottom: 0 }}>
                  Expert stock analysis and investment recommendations
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '2.5rem 1rem' }}>
        {/* Access banner */}
        {filterProduct && !hasAccess && (
          <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#92400e' }}>🔒 Subscription required</div>
              <div style={{ fontSize: '0.85rem', color: '#78350f' }}>Subscribe to <strong>{filterProduct.name}</strong> to read full reports.</div>
            </div>
            <Link href={`/subscribe/${filterProduct.slug}`} style={{ background: '#0057c8', color: '#fff', borderRadius: 6, padding: '0.45rem 1.1rem', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Subscribe Now
            </Link>
          </div>
        )}

        {reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📭</div>
            <p style={{ fontWeight: 600 }}>No reports published yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {reports.map((r: any) => {
              const reportProductId = r.product ? String(r.product._id) : null;
              const isUnlocked = !reportProductId || unlockedProductIds.includes(reportProductId);
              const excerpt = r.content ? r.content.replace(/<[^>]+>/g, '').slice(0, 140) + '…' : '';

              return (
                <div key={String(r._id)} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  {/* Featured image */}
                  <div style={{ height: 140, background: '#f1f5f9', position: 'relative', overflow: 'hidden' }}>
                    {r.featuredImage ? (
                      <img src={r.featuredImage} alt={r.title} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isUnlocked ? 'none' : 'blur(6px)', transform: isUnlocked ? 'none' : 'scale(1.05)' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: '#94a3b8' }}>📄</div>
                    )}
                    {!isUnlocked && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.45)' }}>
                        <span style={{ fontSize: '1.75rem' }}>🔒</span>
                      </div>
                    )}
                    {r.recommendation && (
                      <span style={{ position: 'absolute', top: 8, left: 8, background: REC_COLORS[r.recommendation] || '#6b7280', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 800 }}>
                        {r.recommendation}
                      </span>
                    )}
                  </div>

                  {/* Card body */}
                  <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      {r.sector && <span style={{ fontSize: '0.68rem', background: '#eff6ff', color: '#3b82f6', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>{r.sector.name}</span>}
                      {r.ticker && <span style={{ fontSize: '0.68rem', background: '#f0fdf4', color: '#16a34a', borderRadius: 4, padding: '1px 6px', fontWeight: 700, fontFamily: 'monospace' }}>{r.ticker}</span>}
                    </div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.4rem', lineHeight: 1.35, color: '#0f172a' }}>
                      {isUnlocked ? r.title : (
                        <span style={{ filter: 'blur(4px)', userSelect: 'none' }}>{r.title}</span>
                      )}
                    </h3>
                    {excerpt && (
                      <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 0.75rem', lineHeight: 1.5, flex: 1, filter: isUnlocked ? 'none' : 'blur(3px)' }}>
                        {excerpt}
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{fmtDate(r.createdAt)}</span>
                      {isUnlocked ? (
                        <Link href={`/reports/${r.slug}`} style={{ background: '#0057c8', color: '#fff', borderRadius: 6, padding: '0.3rem 0.85rem', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none' }}>
                          Read Report →
                        </Link>
                      ) : (
                        <Link href={r.product ? `/subscribe/${r.product.slug}` : '/subscribe'} style={{ background: '#f1f5f9', color: '#475569', borderRadius: 6, padding: '0.3rem 0.85rem', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none' }}>
                          🔒 Subscribe
                        </Link>
                      )}
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

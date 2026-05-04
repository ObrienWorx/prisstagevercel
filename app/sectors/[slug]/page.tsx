import connectDB from '@/lib/mongoose';
import Sector from '@/models/Sector';
import Report from '@/models/Report';
import '@/models/Product';
import '@/models/ReportCategory';
import SiteLayout from '@/components/SiteLayout';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySubscriberToken } from '@/lib/subscriberJwt';
import UserProduct from '@/models/UserProduct';

export const dynamic = 'force-dynamic';

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P) {
  const { slug } = await params;
  await connectDB();
  const sector = await Sector.findOne({ slug }).lean() as any;
  if (!sector) return { title: 'Sector Not Found – PristineGaze' };
  return { title: `${sector.name} Research – PristineGaze` };
}

export default async function SectorPage({ params }: P) {
  const { slug } = await params;
  await connectDB();

  const sector = await Sector.findOne({ slug }).lean() as any;
  if (!sector) notFound();

  const reports = await Report.find({ sector: sector._id, publishStatus: 'published' })
    .populate('product', 'name slug')
    .populate('category', 'name')
    .sort({ createdAt: -1 })
    .lean() as any[];

  // Check subscriber access — all reports require subscription
  const cookieStore = await cookies();
  const token = cookieStore.get('subscriber_token')?.value;
  let accessibleProductIds: string[] = [];
  let hasAnyActiveSub = false;

  if (token) {
    const payload = verifySubscriberToken(token);
    if (payload) {
      const userProducts = await UserProduct.find({
        subscriber: payload.subscriberId,
        isActive: true,
        expiryDate: { $gt: new Date() },
      }).lean() as any[];
      accessibleProductIds = userProducts.map((up: any) => up.product.toString());
      hasAnyActiveSub = userProducts.length > 0;
    }
  }

  function hasAccess(report: any) {
    if (report.product) {
      // Requires subscription to the specific linked product
      return accessibleProductIds.includes(report.product._id.toString());
    }
    // No product linked → any active subscription grants access
    return hasAnyActiveSub;
  }

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  const excerpt = (content: string) => content ? content.replace(/<[^>]+>/g, '').slice(0, 180) + '...' : '';

  return (
    <SiteLayout>
      {/* Hero */}
      <div className="sector-hero" style={sector.featuredImage ? { backgroundImage: `url(${sector.featuredImage})` } : {}}>
        <div className="sector-hero-overlay" />
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <Link href="/" style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
            ← Home
          </Link>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#93c5fd', marginBottom: 8 }}>
            Sector Research
          </div>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 0.75rem', color: '#fff' }}>
            {sector.name}
          </h1>
          {sector.description && (
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', margin: '0 0 0.5rem', maxWidth: 640 }}>
              {sector.description}
            </p>
          )}
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            {reports.length} report{reports.length !== 1 ? 's' : ''} available
          </p>
        </div>
      </div>

      {/* Reports grid */}
      <div className="site-section">
        <div className="container">
          {reports.length === 0 ? (
            <div className="text-center py-5">
              <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
              <h3 style={{ color: '#64748b' }}>No reports published yet.</h3>
            </div>
          ) : (
            <div className="row g-4">
              {reports.map((r: any) => {
                const accessible = hasAccess(r);
                return (
                  <div className="col-md-6 col-lg-4" key={r._id.toString()}>
                    <div className="report-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      {/* Image */}
                      <div style={{ position: 'relative' }}>
                        {r.featuredImage
                          ? <img src={r.featuredImage} alt={r.title} className="report-card-img" style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
                          : <div className="report-card-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>📊</div>
                        }
                        {!accessible && (
                          <div className="lock-overlay">
                            <span className="lock-icon">🔒</span>
                            <span className="lock-label">Subscription required</span>
                          </div>
                        )}
                      </div>

                      <div className="report-card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {r.category && <div className="report-card-cat">{r.category.name}</div>}
                        <h3 className="report-card-title" style={{ flex: 1, marginBottom: 8 }}>{r.title}</h3>
                        {r.upsellTicker && (
                          <div style={{ display: 'inline-block', background: '#f0fdf4', color: '#15803d', fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 5, marginBottom: 8 }}>
                            {r.upsellTicker}
                          </div>
                        )}
                        <p style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.5, marginBottom: 12 }}>
                          {accessible ? excerpt(r.content) : 'Subscribe to read this full research report.'}
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                          <span style={{ fontSize: 11.5, color: '#94a3b8' }}>{fmtDate(r.createdAt)}</span>
                          {accessible ? (
                            <Link href={`/reports/${r.slug}`} style={{ fontSize: 13, fontWeight: 600, color: '#3b82f6', textDecoration: 'none' }}>
                              Read Report →
                            </Link>
                          ) : (
                            <Link href={r.product ? `/subscribe/${r.product.slug}` : '/subscribe'} style={{ fontSize: 12.5, fontWeight: 600, color: '#dc2626', textDecoration: 'none' }}>
                              Subscribe to unlock
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
      </div>
    </SiteLayout>
  );
}

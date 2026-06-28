import connectDB from '@/lib/mongoose';
import Product from '@/models/Product';
import SiteLayout from '@/components/SiteLayout';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Subscribe – PristineGaze', description: 'Choose a PristineGaze subscription plan.' };

const RISK_COLORS: Record<string, { bg: string; text: string }> = {
  Low: { bg: '#dcfce7', text: '#15803d' },
  Medium: { bg: '#fef9c3', text: '#854d0e' },
  High: { bg: '#ffedd5', text: '#c2410c' },
  'Very High': { bg: '#fee2e2', text: '#991b1b' },
};

export default async function SubscribePage() {
  await connectDB();
  const products = await Product.find({ status: 'published', isActive: true, showOnFrontend: { $ne: false } })
    .sort({ sortOrder: 1, regularPrice: 1 })
    .lean() as any[];

  const fmtPrice = (p: any) => (p.regularPrice ?? 0).toFixed(2);
  const fmtDur = (p: any) => p.durationValue ? `${p.durationValue} ${p.durationType}` : '';

  return (
    <SiteLayout>

      <div className="site-section">
        <div className="container">
          {products.length === 0 ? (
            <div className="text-center py-5">
              <div style={{ fontSize: 48 }} className="mb-3">📦</div>
              <h3 className="text-muted">No plans available yet.</h3>
            </div>
          ) : (
            <div className="row g-4 justify-content-center">
              {products.map((p) => {
                const rc = p.riskRating ? RISK_COLORS[p.riskRating] : null;
                return (
                  <div className="col-md-6 col-lg-4" key={p._id.toString()}>
                    <div className={`product-card h-100 ${p.isMostPopular ? 'featured' : ''}`}>
                      {p.isMostPopular && (
                        <div className="popular-banner">{p.popularBadgeText?.trim() || 'Most Popular'}</div>
                      )}
                      {p.featuredImage
                        ? <img src={p.featuredImage} alt={p.name} className="product-card-img" />
                        : <div className="product-card-img-placeholder">📊</div>
                      }
                      <div className="product-card-body">
                        <div className="product-card-name">{p.name}</div>
                        <div className="product-card-duration">{fmtDur(p)} access</div>
                        <div className="product-card-price">
                          <div className="amount">${fmtPrice(p)}</div>
                          {p.plans?.length > 1 && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{p.plans.length} plans available</div>}
                        </div>

                        {rc && (
                          <div className="risk-badge" style={{ background: rc.bg, color: rc.text }}>
                            Risk: {p.riskRating}
                          </div>
                        )}

                        {p.shortDescription && (
                          <p className="small text-muted mb-3" style={{ lineHeight: 1.6 }}>{p.shortDescription}</p>
                        )}

                        {p.features?.length > 0 && (
                          <ul className="product-features">
                            {p.features.map((f: string, fi: number) => <li key={fi}>{f}</li>)}
                          </ul>
                        )}

                        <Link href={`/subscribe/${p.slug}`} className="btn-subscribe">KNOW MORE →</Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="guarantee-strip text-center">
            <div className="guarantee-items">
              {['✓ Instant access', '✓ Australian market focus', '✓ Daily updates'].map(t => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

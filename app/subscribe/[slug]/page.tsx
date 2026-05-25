import connectDB from '@/lib/mongoose';
import Product from '@/models/Product';
import SiteLayout from '@/components/SiteLayout';
import PurchaseCard from '@/components/PurchaseCard';
import SaleCountdownBanner from '@/components/SaleCountdownBanner';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

type P = { params: Promise<{ slug: string }> };

type PlanDoc = {
  name?: string;
  regularPrice?: number;
  salePrice?: number | null;
  durationValue?: number;
  durationType?: string;
};

type ProductDoc = {
  name: string;
  slug: string;
  shortDescription?: string;
  fullDescription?: string;
  metaDescription?: string;
  regularPrice?: number;
  salePrice?: number | null;
  saleOverPrice?: number | null;
  saleOverContent?: string;
  saleStartDate?: Date | string | null;
  saleEndDate?: Date | string | null;
  durationValue?: number;
  durationType?: string;
  plans?: PlanDoc[];
  features?: string[];
  saleBanner?: string;
  riskRating?: string;
};

const SALE_OFFER_SUFFIX = '-limited-sale-offer';

function getSubscribeSlug(rawSlug: string) {
  const isSaleOffer = rawSlug.endsWith(SALE_OFFER_SUFFIX);
  return {
    productSlug: isSaleOffer ? rawSlug.slice(0, -SALE_OFFER_SUFFIX.length) : rawSlug,
    isSaleOffer,
  };
}

function isProductSaleActive(product: ProductDoc) {
  const now = new Date();
  const plans = product.plans ?? [];
  const hasSalePrice = plans.length > 0
    ? plans.some((pl) => pl.salePrice != null)
    : product.salePrice != null;

  if (!hasSalePrice) return false;
  if (product.saleStartDate && new Date(product.saleStartDate) > now) return false;
  if (product.saleEndDate && new Date(product.saleEndDate) < now) return false;
  return true;
}

function isProductSaleEnded(product: ProductDoc) {
  if (!product.saleEndDate) return false;
  return new Date(product.saleEndDate) < new Date();
}

export async function generateMetadata({ params }: P) {
  const { slug } = await params;
  const { productSlug, isSaleOffer } = getSubscribeSlug(slug);
  await connectDB();
  const p = await Product.findOne({ slug: productSlug, status: 'published', isActive: true }).lean() as ProductDoc | null;
  if (!p) return { title: 'Plan Not Found – PristineGaze' };
  return {
    title: `${p.name} – PristineGaze`,
    description: p.shortDescription || p.metaDescription,
    ...(isSaleOffer && { robots: { index: false, follow: false } }),
  };
}

export default async function ProductDetailPage({ params }: P) {
  const { slug } = await params;
  const { productSlug, isSaleOffer } = getSubscribeSlug(slug);
  await connectDB();
  const p = await Product.findOne({ slug: productSlug, status: 'published', isActive: true }).lean() as ProductDoc | null;
  if (!p) notFound();
  const saleActive = isProductSaleActive(p);
  const saleEnded = isProductSaleEnded(p);
  const showExpiredOffer = isSaleOffer && saleEnded;
  if (isSaleOffer && !saleActive && !showExpiredOffer) notFound();

  // Build plans array — fall back to legacy top-level fields if no plans saved yet
  const now = new Date();
  const isSaleActive = (sp: number | null, sd?: Date | string | null, ed?: Date | string | null) => {
    if (sp == null) return false;
    if (sd && new Date(sd) > now) return false;
    if (ed && new Date(ed) < now) return false;
    return true;
  };

  // Determine if any plan has an active sale and there's an end date for the countdown
  const savedPlans = p.plans ?? [];
  const anySaleActive = isSaleOffer && saleActive && (savedPlans.length > 0
    ? savedPlans.some((pl) => isSaleActive(pl.salePrice ?? null, p.saleStartDate, p.saleEndDate))
    : isSaleActive(p.salePrice ?? null, p.saleStartDate, p.saleEndDate));
  const saleEndDate = anySaleActive && p.saleEndDate
    ? new Date(p.saleEndDate).toISOString()
    : undefined;

  const plans: { name: string; regularPrice: number; salePrice: number | null; durationValue: number; durationType: string }[] =
    savedPlans.length > 0
      ? savedPlans.map((pl) => ({
        name: pl.name ?? '',
        regularPrice: pl.regularPrice ?? 0,
        salePrice: showExpiredOffer ? p.saleOverPrice ?? null : isSaleOffer && isSaleActive(pl.salePrice ?? null, p.saleStartDate, p.saleEndDate) ? pl.salePrice ?? null : null,
        durationValue: pl.durationValue ?? 1,
        durationType: pl.durationType ?? 'months',
      }))
      : [{
        name: '',
        regularPrice: p.regularPrice ?? 0,
        salePrice: showExpiredOffer ? p.saleOverPrice ?? null : isSaleOffer && isSaleActive(p.salePrice ?? null, p.saleStartDate, p.saleEndDate) ? p.salePrice ?? null : null,
        durationValue: p.durationValue ?? 1,
        durationType: p.durationType ?? 'months',
      }];

  const RISK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    Low: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
    Medium: { bg: '#fefce8', text: '#854d0e', border: '#fde68a' },
    High: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
    'Very High': { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
  };

  const originalPrice = savedPlans[0]?.regularPrice ?? p.regularPrice ?? 0;
  const afterSalePrice = p.saleOverPrice ?? originalPrice;
  const expiredContent = p.saleOverContent?.trim()
    ? p.saleOverContent
    : `<p><strong>Sorry, this exclusive offer has now ended!</strong></p>
      <p>BUT HERE'S THE GOOD NEWS: You can still unlock premium access to Pristine Gaze Reports if you keep reading below...</p>
      <p>If you're looking to make smarter investment decisions in the Australian market, Pristine Gaze can help. You don't need to spend hours researching stocks or trying to follow every market move. You just need reliable market insights, expert analysis, and quality stock opportunities delivered straight to you.</p>
      <p>Join now for <strong>ONLY $${afterSalePrice.toFixed(2)}</strong>.</p>`;

  return (
    <SiteLayout>
      {/* Plan Hero */}
      {/* <div className="plan-hero">
        <div className="container">
          <div className="row align-items-center gap-4">
            <div className="col-lg-12 text-center">
              <h1>{p.name}</h1>
            </div>
          </div>
        </div>
      </div> */}

      {/* Full-width countdown bar — only when sale has an end date */}
      {saleEndDate && (
        <SaleCountdownBanner endDate={saleEndDate} />
      )}

      {showExpiredOffer && (
        <section style={{ background: '#fff', padding: '2rem 0 1rem' }}>
          <div className="container">
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 410px', gap: '3rem', alignItems: 'start' }}>
              <div>
                <div className="tiptap-prose" style={{ fontSize: 15.5, lineHeight: 1.55, color: '#111827' }} dangerouslySetInnerHTML={{ __html: expiredContent }} />
                <a href="#subscribe-now" className="btn-subscribe" style={{ width: 310, maxWidth: '100%', marginTop: '1.5rem', marginBottom: '0.75rem', background: '#00c314', borderRadius: 16, fontSize: 25, fontStyle: 'italic' }}>
                  Subscribe Now
                </a>
                <p style={{ fontSize: 12.5, color: '#111827', maxWidth: 360, lineHeight: 1.35, margin: 0 }}>
                  Our subscription comes with 14 days cooling-off period, however, it only applies to new subscribers.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', maxWidth: 650, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 2px 12px rgba(15,23,42,0.15)', marginTop: '2.25rem', padding: '1.75rem 2rem' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.45, color: '#000' }}>Massive Discount<br />For New Members</div>
                  <div style={{ borderLeft: '1px solid #e5e7eb', textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#d97706' }}>Get special access for just</div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: '#001b3a', lineHeight: 1.15 }}>
                      ${afterSalePrice.toFixed(2)}
                      {originalPrice > 0 && <s style={{ fontSize: 20, marginLeft: 10, color: '#111827' }}>${originalPrice.toFixed(2)}</s>}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#d97706' }}>{p.durationValue ?? savedPlans[0]?.durationValue ?? ''} {p.durationType ?? savedPlans[0]?.durationType ?? ''} plan</div>
                  </div>
                </div>
              </div>
              <div>
                <div style={{ background: '#dc1f26', color: '#fff', borderRadius: 8, padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontWeight: 800 }}>
                  <span>Limited Time Sale has ENDED -</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['HOURS', 'MINS', 'SECS'].map(label => (
                      <div key={label} style={{ textAlign: 'center' }}>
                        <div style={{ background: '#b91c1c', borderRadius: 5, padding: '2px 11px', fontSize: 16 }}>00</div>
                        <div style={{ fontSize: 7, opacity: 0.85 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {p.saleBanner && (
                  <img src={p.saleBanner} alt={`${p.name} promotion`} style={{ width: '100%', marginTop: 12, borderRadius: 14, maxHeight: 510, objectFit: 'cover', display: 'block' }} />
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Content */}
      <div className="site-section">
        <div className="container">
          <div className="row">
            <div className="col-lg-7">
              {isSaleOffer && p.saleBanner && (
                <div className="container mb-3">
                  <img
                    src={p.saleBanner}
                    alt={`${p.name} promotion`}
                    style={{ width: '100%', borderRadius: 14, maxHeight: 220, objectFit: 'cover', display: 'block' }}
                  />
                </div>
              )}
              <h1 className='fw-bolder'>{p.name}</h1>

              {p.shortDescription && (
                <div style={{ marginBottom: '2rem', padding: '1.25rem 1.5rem', background: '#eff6ff', borderRadius: 12, borderLeft: '4px solid #3b82f6' }}>
                  <p style={{ margin: 0, fontSize: 15, color: '#1e40af', lineHeight: 1.7 }}>{p.shortDescription}</p>
                </div>
              )}

              {p.fullDescription && (
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>About This Plan</h3>
                  <div
                    className="tiptap-prose"
                    style={{ fontSize: 15, color: '#374151', lineHeight: 1.8 }}
                    dangerouslySetInnerHTML={{ __html: p.fullDescription }}
                  />
                </div>
              )}
              {p.features && p.features.length > 0 && (
                <div style={{ marginBottom: '3rem' }}>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: '1.5rem' }}>What&apos;s Included</h2>
                  <div className="row g-3">
                    {p.features.map((f: string, i: number) => (
                      <div className="col-md-6" key={i}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13.5, color: '#1e293b', lineHeight: 1.4 }}>
                          <span style={{ color: '#16a34a', fontWeight: 700, flexShrink: 0, fontSize: 16 }}>✓</span>
                          {f}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div id="subscribe-now" className="col-lg-5 d-none d-lg-block" style={{ scrollMarginTop: 90 }}>
              <PurchaseCard slug={p.slug} plans={plans} saleEndDate={saleEndDate} saleOffer={isSaleOffer} />

              <div className="mt-4" >
                {p.riskRating && (() => {
                  const rc = RISK_COLORS[p.riskRating];
                  return (
                    <div style={{ background: rc.bg, border: `1px solid ${rc.border}`, borderRadius: 10, padding: '10px 16px', marginBottom: '1rem', fontSize: 13, fontWeight: 600, color: rc.text }}>
                      Risk Rating: {p.riskRating}
                    </div>
                  );
                })()}
                <div style={{ background: '#f8fafc', borderRadius: 14, padding: '1.5rem', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>Why PristineGaze?</h4>
                  {[
                    '🇦🇺 100% Australian market focus',
                    '📊 Daily sector analysis & reports',
                    '🔒 Secure, encrypted platform',
                    '📧 Daily email digest included',
                    '❌ Cancel anytime, no lock-in',
                  ].map(t => (
                    <div key={t} style={{ fontSize: 13, color: '#374151', padding: '6px 0', borderBottom: '1px solid #f1f5f9', lineHeight: 1.5 }}>{t}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

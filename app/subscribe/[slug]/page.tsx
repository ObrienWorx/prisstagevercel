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
  saleOverBanner?: string;
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

  const now = new Date();
  const isSaleActive = (sp: number | null, sd?: Date | string | null, ed?: Date | string | null) => {
    if (sp == null) return false;
    if (sd && new Date(sd) > now) return false;
    if (ed && new Date(ed) < now) return false;
    return true;
  };

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

  const riskClass = p.riskRating ? `risk-${p.riskRating.toLowerCase().replace(/\s+/g, '-')}` : '';

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

      {saleEndDate && (
        <SaleCountdownBanner endDate={saleEndDate} />
      )}

      {showExpiredOffer && (
        <section className="sale-expired-section">
          <div className="container">
            <div className="row g-5 align-items-start">
              <div className="col-lg-7">
                <div className="tiptap-prose sale-expired-copy" dangerouslySetInnerHTML={{ __html: expiredContent }} />
                <a href="#subscribe-now" className="btn-subscribe sale-expired-btn">
                  Subscribe Now
                </a>
                <p className="sale-expired-note">
                  Our subscription comes with 14 days cooling-off period, however, it only applies to new subscribers.
                </p>
                <div className="sale-expired-card">
                  <div className="sale-expired-card-title">Massive Discount<br />For New Members</div>
                  <div className="sale-expired-card-detail">
                    <div className="sale-expired-kicker">Get special access for just</div>
                    <div className="sale-expired-price">
                      ${afterSalePrice.toFixed(2)}
                      {originalPrice > 0 && <s>${originalPrice.toFixed(2)}</s>}
                    </div>
                    <div className="sale-expired-duration">{p.durationValue ?? savedPlans[0]?.durationValue ?? ''} {p.durationType ?? savedPlans[0]?.durationType ?? ''} plan</div>
                  </div>
                </div>
              </div>
              <div className="col-lg-5">
                <div className="sale-ended-strip">
                  <span>Limited Time Sale has ENDED -</span>
                  <div className="sale-ended-timer">
                    {['HOURS', 'MINS', 'SECS'].map(label => (
                      <div key={label} className="sale-ended-chip">
                        <div className="sale-ended-value">00</div>
                        <div className="sale-ended-label">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {(p.saleOverBanner || p.saleBanner) && (
                  <img src={p.saleOverBanner || p.saleBanner!} alt={`${p.name} promotion`} className="sale-expired-banner" />
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {showExpiredOffer && <hr className="my-5 container" />}

      <div className="site-section">
        <div className="container">
          <div className="row">
            <div className="col-lg-7">
              {isSaleOffer && !showExpiredOffer && p.saleBanner && (
                <div className="subscribe-sale-banner-wrap mb-3">
                  <img
                    src={p.saleBanner}
                    alt={`${p.name} promotion`}
                    className="subscribe-sale-banner"
                  />
                </div>
              )}
              <h1 className='fw-bolder'>{p.name}</h1>

              {p.shortDescription && (
                <div className="subscribe-desc-callout">
                  <p>{p.shortDescription}</p>
                </div>
              )}

              {p.fullDescription && (
                <div>
                  <h3 className="subscribe-content-title">About This Plan</h3>
                  <div
                    className="tiptap-prose subscribe-prose"
                    dangerouslySetInnerHTML={{ __html: p.fullDescription }}
                  />
                </div>
              )}
              {p.features && p.features.length > 0 && (
                <div className="subscribe-features">
                  <h2>What&apos;s Included</h2>
                  <div className="row g-3">
                    {p.features.map((f: string, i: number) => (
                      <div className="col-md-6" key={i}>
                        <div className="subscribe-feature-card">
                          <span aria-hidden="true">+</span>
                          {f}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div id="subscribe-now" className="col-lg-5 d-none d-lg-block subscribe-anchor">
              <PurchaseCard slug={p.slug} plans={plans} saleEndDate={saleEndDate} saleOffer={isSaleOffer} />

              <div className="mt-4" >
                {p.riskRating && (
                  <div className={`subscribe-risk-badge ${riskClass}`}>
                    Risk Rating: {p.riskRating}
                  </div>
                )}
                <div className="subscribe-why-card">
                  <h4>Why PristineGaze?</h4>
                  {[
                    '🇦🇺 100% Australian market focus',
                    '📊 Daily sector analysis & reports',
                    '🔒 Secure, encrypted platform',
                    '📧 Daily email digest included',
                  ].map(t => (
                    <div key={t} className="subscribe-why-item">{t}</div>
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

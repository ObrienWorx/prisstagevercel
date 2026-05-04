import connectDB from '@/lib/mongoose';
import Product from '@/models/Product';
import SiteLayout from '@/components/SiteLayout';
import PurchaseCard from '@/components/PurchaseCard';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P) {
  const { slug } = await params;
  await connectDB();
  const p = await Product.findOne({ slug, status: 'published', isActive: true }).lean() as any;
  if (!p) return { title: 'Plan Not Found – PristineGaze' };
  return { title: `${p.name} – PristineGaze`, description: p.shortDescription || p.metaDescription };
}

export default async function ProductDetailPage({ params }: P) {
  const { slug } = await params;
  await connectDB();
  const p = await Product.findOne({ slug, status: 'published', isActive: true }).lean() as any;
  if (!p) notFound();

  const now = new Date();
  const isSaleActive = (() => {
    if (p.salePrice == null) return false;
    if (p.saleStartDate && new Date(p.saleStartDate) > now) return false;
    if (p.saleEndDate && new Date(p.saleEndDate) < now) return false;
    return true;
  })();
  const activeSalePrice = isSaleActive ? p.salePrice : null;
  const displayPrice = (activeSalePrice ?? p.regularPrice ?? 0).toFixed(2);
  const fmtDur = p.durationValue ? `${p.durationValue} ${p.durationType}` : '';

  const RISK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    Low: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
    Medium: { bg: '#fefce8', text: '#854d0e', border: '#fde68a' },
    High: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
    'Very High': { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
  };

  return (
    <SiteLayout>
      {/* Plan Hero */}
      <div className="plan-hero">
        <div className="container">
          <div className="row align-items-center gap-4">
            <div className="col-lg-12 text-center">
              <h1>{p.name}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="site-section">
        <div className="container">
          <div className="row">
            <div className="col-lg-7">
              {/* Features */}
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
            </div>

            <div className="col-lg-4 offset-lg-1 d-none d-lg-block">
              <div style={{ position: 'sticky', top: 80 }}>
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
                <PurchaseCard
                  slug={p.slug}
                  price={displayPrice}
                  duration={fmtDur}
                  regularPrice={p.regularPrice}
                  salePrice={activeSalePrice}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

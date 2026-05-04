import connectDB from '@/lib/mongoose';
import Product from '@/models/Product';
import Video from '@/models/Video';
import SiteLayout from '@/components/SiteLayout';
import Link from 'next/link';
import { getYouTubeId } from '@/lib/orderHelpers';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  await connectDB();

  const products = await Product.find({ status: 'published', isActive: true })
    .select('name slug regularPrice salePrice durationType durationValue featuredImage features shortDescription')
    .sort({ regularPrice: 1 })
    .limit(3)
    .lean() as any[];

  const videos = await Video.find({ isActive: true })
    .select('title youtubeUrl description')
    .sort({ createdAt: -1 })
    .limit(3)
    .lean() as any[];

  const fmtPrice = (p: any) => {
    const price = p.salePrice ?? p.regularPrice ?? 0;
    return `$${price.toFixed(2)}`;
  };

  const fmtDuration = (p: any) => {
    if (!p.durationValue) return '';
    return `${p.durationValue} ${p.durationType}`;
  };

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="site-hero">
        <div className="container position-relative">
          <div className="row align-items-center">
            <div className="col-lg-7">
              <div className="site-hero-badge">🇦🇺 Australian Investment Research</div>
              <h1>Market Intelligence,<br /><span style={{ color: '#60a5fa' }}>Delivered Daily</span></h1>
              <p className="lead">
                Australia&apos;s most trusted investment research platform — sector analysis, market reports, and expert insights to stay ahead of the market.
              </p>
              <div className="hero-cta-group">
                <Link href="/subscribe" className="btn-hero-primary">View Plans →</Link>
                <Link href="/videos" className="btn-hero-ghost">Watch Videos</Link>
              </div>
            </div>
            <div className="col-lg-5 d-none d-lg-flex justify-content-end">
              <div style={{ fontSize: 120, opacity: 0.12 }}>📊</div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <div className="stats-bar">
        <div className="container">
          <div className="row g-3 text-center">
            {[
              { num: '500+', lbl: 'Research Reports' },
              { num: '12+', lbl: 'Market Sectors' },
              { num: 'Daily', lbl: 'Market Updates' },
              { num: '100%', lbl: 'Australian Focus' },
            ].map(s => (
              <div className="col-6 col-md-3" key={s.lbl}>
                <div className="stat-item">
                  <div className="num">{s.num}</div>
                  <div className="lbl">{s.lbl}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PLANS PREVIEW */}
      {products.length > 0 && (
        <section className="site-section">
          <div className="container">
            <div className="text-center mb-5">
              <div className="section-label">Subscription Plans</div>
              <h2 className="section-title">Choose Your Level of Access</h2>
              <p className="section-sub mx-auto">Get full access to premium market research, sector analysis and daily insights.</p>
            </div>
            <div className="row g-4 justify-content-center">
              {products.map((p, i) => (
                <div className="col-md-6 col-lg-4" key={p._id.toString()}>
                  <div className={`product-card ${i === 1 ? 'featured' : ''}`}>
                    {i === 1 && (
                      <div style={{ background: '#3b82f6', color: '#fff', textAlign: 'center', fontSize: 11, fontWeight: 700, padding: '6px', letterSpacing: 1, textTransform: 'uppercase' }}>
                        Most Popular
                      </div>
                    )}
                    {p.featuredImage
                      ? <img src={p.featuredImage} alt={p.name} className="product-card-img" />
                      : <div className="product-card-img-placeholder">📊</div>
                    }
                    <div className="product-card-body">
                      <div className="product-card-name">{p.name}</div>
                      <div className="product-card-duration">{fmtDuration(p)} access</div>
                      <div className="product-card-price">
                        <div className={`amount ${p.salePrice != null ? 'amount-sale' : ''}`}>
                          {fmtPrice(p)}
                        </div>
                        {p.salePrice != null && p.regularPrice && (
                          <div className="was">${p.regularPrice.toFixed(2)} regular</div>
                        )}
                      </div>
                      <ul className="product-features">
                        {(p.features || []).slice(0, 4).map((f: string, fi: number) => (
                          <li key={fi}>{f}</li>
                        ))}
                      </ul>
                      <Link href={`/subscribe/${p.slug}`} className="btn-subscribe">
                        Get Started →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-4">
              <Link href="/subscribe" style={{ fontSize: 14, color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>
                View all plans →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* VIDEOS PREVIEW */}
      {videos.length > 0 && (
        <section className="site-section site-section-alt">
          <div className="container">
            <div className="d-flex justify-content-between align-items-end mb-4 flex-wrap gap-3">
              <div>
                <div className="section-label">Video Insights</div>
                <h2 className="section-title" style={{ marginBottom: 0 }}>Watch &amp; Learn</h2>
              </div>
              <Link href="/videos" style={{ fontSize: 14, color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
            </div>
            <div className="row g-4">
              {videos.map((v: any) => {
                const vid = getYouTubeId(v.youtubeUrl);
                return (
                  <div className="col-md-4" key={v._id.toString()}>
                    <a href={v.youtubeUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                      <div className="video-card">
                        <div style={{ position: 'relative' }}>
                          {vid
                            ? <img src={`https://img.youtube.com/vi/${vid}/hqdefault.jpg`} alt={v.title} className="video-thumb" />
                            : <div className="video-thumb" style={{ background: '#1e3a5f', height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>▶️</div>
                          }
                          <div className="video-play-overlay"><div className="play-btn">▶</div></div>
                        </div>
                        <div className="video-card-body">
                          <div className="video-card-title">{v.title}</div>
                          {v.description && <div className="video-card-desc">{v.description}</div>}
                        </div>
                      </div>
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)', padding: '5rem 0', color: '#fff', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.25rem)', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-0.5px' }}>
            Ready to Invest Smarter?
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.68)', marginBottom: '2rem', maxWidth: 480, margin: '0 auto 2rem' }}>
            Join thousands of Australian investors who rely on PristineGaze for daily market intelligence.
          </p>
          <Link href="/subscribe" className="btn-hero-primary" style={{ display: 'inline-block' }}>
            View Subscription Plans →
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}

'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Script from 'next/script';

interface SubUser { name: string; email: string; }
interface Sector { _id: string; name: string; slug: string; reportCount: number; featuredImage?: string; }
interface BlogType { _id: string; label: string; count: number; navHighlight?: boolean; }

export default function FrontNav() {
  const pathname = usePathname();
  const [sub, setSub] = useState<SubUser | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [blogTypes, setBlogTypes] = useState<BlogType[]>([]);
  const [sectorOpen, setSectorOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const sectorRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('subscriber_token');
    if (token) {
      fetch('/api/subscriber/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { if (d.success) setSub(d.data.subscriber); })
        .catch(() => {});
    }
    fetch('/api/public/sectors')
      .then(r => r.json())
      .then(d => { if (d.success) setSectors(d.data); })
      .catch(() => {});
    fetch('/api/public/blog-types')
      .then(r => r.json())
      .then(d => { if (d.success) setBlogTypes(d.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sectorRef.current && !sectorRef.current.contains(e.target as Node)) setSectorOpen(false);
      if (productRef.current && !productRef.current.contains(e.target as Node)) setProductOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const logout = () => {
    localStorage.removeItem('subscriber_token');
    localStorage.removeItem('subscriber_user');
    setSub(null);
    window.location.href = '/';
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
  };

  return (
    <>
      <style>{`
        @keyframes navPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        .hn-link-highlight {
          color: #f59e0b !important;
          animation: navPulse 1.4s ease-in-out infinite;
        }
        .hn-link-highlight:hover { opacity: 1 !important; }
      `}</style>
      <header className="site-header">
        {/* ── TOP UTILITY BAR ── */}
        <div className="header-topbar">
          <div className="container">
            <div className="header-topbar-inner">
              <div className="header-social">
                <a href="#" aria-label="Facebook" className="htb-social">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </a>
                <a href="#" aria-label="Twitter" className="htb-social">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>
                </a>
                <a href="#" aria-label="YouTube" className="htb-social">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-1.96C18.88 4 12 4 12 4s-6.88 0-8.6.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.4 19.54C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon fill="#fff" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>
                </a>
              </div>
              <div className="header-contact">
                <a href="tel:0489990844" className="htb-contact">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.77a16 16 0 0 0 8.32 8.32l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 18.92z"/></svg>
                  0489 990 844
                </a>
                <span className="htb-divider">|</span>
                <a href="mailto:info@pristinegaze.com.au" className="htb-contact">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  info@pristinegaze.com.au
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN HEADER (Logo + Search + Account) ── */}
        <div className="header-main">
          <div className="container">
            <div className="header-main-inner">
              {/* Logo */}
              <Link href="/" className="header-logo">
                <img src="/logo.png" alt="Pristine Gaze" className='w-100'/>
              </Link>

              {/* Search */}
              <form className="header-search" onSubmit={handleSearch}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="header-search-input"
                />
                <button type="submit" className="header-search-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </button>
              </form>

              {/* Actions */}
              <div className="header-actions">
                {sub ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Link href="/user/dashboard" className="header-account-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      My Account
                    </Link>
                    <button onClick={logout} className="header-signout-btn">Sign out</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Link href="/auth/login" className="header-account-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      My Account
                    </Link>
                    <Link href="/subscribe" className="header-cart-btn">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                    </Link>
                  </div>
                )}
                <button className="nav-hamburger" onClick={() => setMobileOpen(true)} aria-label="Open menu">
                  <span /><span /><span />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── TRADINGVIEW CHART ── */}
        <div className="header-ticker">
          <div className="tradingview-widget-container" style={{ width: '100%', height: 400 }}>
            <div id="tradingview_bhp" style={{ width: '100%', height: '100%' }} />
          </div>
          <Script
            src="https://s3.tradingview.com/tv.js"
            strategy="lazyOnload"
            onLoad={() => {
              if (typeof (window as any).TradingView !== 'undefined') {
                new (window as any).TradingView.widget({
                  container_id: 'tradingview_bhp',
                  symbol: 'ASX:BHP',
                  interval: 'D',
                  theme: 'light',
                  style: '1',
                  locale: 'en',
                  width: '100%',
                  height: 400,
                });
              }
            }}
          />
        </div>

        {/* ── NAVIGATION BAR ── */}
        <nav className="header-nav">
          <div className="container">
            <div className="header-nav-inner">

              <Link href="/" className={`hn-link ${pathname === '/' ? 'active' : ''}`}>Home</Link>
              <Link href="/about-us" className={`hn-link ${isActive('/about-us') ? 'active' : ''}`}>About Us</Link>

              {/* Our Product dropdown */}
              <div ref={productRef} style={{ position: 'relative' }}>
                <button
                  className={`hn-link hn-drop ${isActive('/subscribe') ? 'active' : ''}`}
                  onClick={() => { setProductOpen(o => !o); setSectorOpen(false); }}
                >
                  Product
                  <svg width="9" height="5" viewBox="0 0 10 6" fill="none" style={{ marginLeft: 4, transition: 'transform 0.2s', transform: productOpen ? 'rotate(180deg)' : 'none' }}>
                    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {productOpen && (
                  <div className="hn-dropdown">
                    <Link href="/subscribe" className="hn-dd-item" onClick={() => setProductOpen(false)}>All Plans</Link>
                  </div>
                )}
              </div>

              <Link href="/subscribe" className={`hn-link ${isActive('/subscribe') && !isActive('/subscribe/') ? 'active' : ''}`}>Subscribe</Link>

              {/* Sector dropdown */}
              <div ref={sectorRef} style={{ position: 'relative' }}>
                <button
                  className={`hn-link hn-drop ${isActive('/sectors') ? 'active' : ''}`}
                  onClick={() => { setSectorOpen(o => !o); setProductOpen(false); }}
                >
                  Sector
                  <svg width="9" height="5" viewBox="0 0 10 6" fill="none" style={{ marginLeft: 4, transition: 'transform 0.2s', transform: sectorOpen ? 'rotate(180deg)' : 'none' }}>
                    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {sectorOpen && (
                  <div className="hn-dropdown" style={{ minWidth: 220 }}>
                    {sectors.length === 0 ? (
                      <div className="hn-dd-item" style={{ color: '#94a3b8', cursor: 'default' }}>No sectors yet</div>
                    ) : sectors.map(s => (
                      <Link
                        key={s._id}
                        href={`/sectors/${s.slug}`}
                        className={`hn-dd-item ${isActive(`/sectors/${s.slug}`) ? 'active' : ''}`}
                        onClick={() => setSectorOpen(false)}
                      >
                        {s.featuredImage && (
                          <img src={s.featuredImage} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'cover', marginRight: 8 }} />
                        )}
                        {s.name}
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8', background: '#f1f5f9', padding: '1px 7px', borderRadius: 20 }}>{s.reportCount}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link href="/videos" className={`hn-link ${isActive('/videos') ? 'active' : ''}`}>Videos</Link>

              {/* Dynamic blog categories with showInNav */}
              {blogTypes.map(bt => (
                <Link
                  key={bt._id}
                  href={`/${bt._id}`}
                  className={`hn-link ${isActive(`/${bt._id}`) ? 'active' : ''} ${bt.navHighlight ? 'hn-link-highlight' : ''}`}
                >
                  {bt.label || (bt._id ?? '').replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  {bt.navHighlight && <span style={{ marginLeft: 4, fontSize: 9, verticalAlign: 'super', background: '#f59e0b', color: '#000', padding: '1px 5px', borderRadius: 4, fontWeight: 800, letterSpacing: '0.3px' }}>HOT</span>}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile nav panel */}
      <div className={`mobile-nav ${mobileOpen ? 'open' : ''}`}>
        <div className="mobile-nav-overlay" onClick={() => setMobileOpen(false)} />
        <div className="mobile-nav-panel">
          <button className="mobile-nav-close" onClick={() => setMobileOpen(false)}>✕</button>

          <Link href="/" className={`mobile-nav-link ${pathname === '/' ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>Home</Link>
          <Link href="/about-us" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>About Us</Link>
          <Link href="/subscribe" className={`mobile-nav-link ${isActive('/subscribe') ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>Subscribe</Link>

          {sectors.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.3)', margin: '1rem 0 0.5rem' }}>Sectors</div>
              {sectors.map(s => (
                <Link key={s._id} href={`/sectors/${s.slug}`} className="mobile-nav-link" onClick={() => setMobileOpen(false)} style={{ fontSize: 14, paddingLeft: 8 }}>
                  {s.name}
                </Link>
              ))}
            </>
          )}

          <Link href="/editorial" className={`mobile-nav-link ${isActive('/editorial') ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>Editorial</Link>
          <Link href="/videos" className={`mobile-nav-link ${isActive('/videos') ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>Videos</Link>

          {blogTypes.map(bt => (
            <Link key={bt._id} href={`/${bt._id}`} className={`mobile-nav-link ${bt.navHighlight ? 'hn-link-highlight' : ''}`} onClick={() => setMobileOpen(false)}>
              {bt.label || bt._id.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
              {bt.navHighlight && <span style={{ marginLeft: 6, fontSize: 9, background: '#f59e0b', color: '#000', padding: '1px 5px', borderRadius: 4, fontWeight: 800 }}>HOT</span>}
            </Link>
          ))}

          <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sub ? (
              <>
                <Link href="/user/dashboard" className="header-account-btn" style={{ textAlign: 'center', display: 'block' }} onClick={() => setMobileOpen(false)}>My Dashboard</Link>
                <button onClick={logout} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', padding: '10px', borderRadius: 10, cursor: 'pointer', fontSize: 14 }}>Sign Out</button>
              </>
            ) : (
              <Link href="/auth/login" className="header-account-btn" style={{ textAlign: 'center', display: 'block' }} onClick={() => setMobileOpen(false)}>Login / My Account</Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SubUser { name: string; email: string; }
interface Sector { _id: string; name: string; slug: string; reportCount: number; featuredImage?: string; }
interface Product { _id: string; name: string; slug: string; featuredImage?: string; durationValue?: number; durationType?: string; }
interface SubProduct { product: { _id: string } | null; expiryDate: string; isActive: boolean; }
interface BlogType { _id: string; label: string; count: number; navHighlight?: boolean; }

export default function FrontNav() {
  const pathname = usePathname();
  const [sub, setSub] = useState<SubUser | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [unlockedProductIds, setUnlockedProductIds] = useState<string[]>([]);
  const [blogTypes, setBlogTypes] = useState<BlogType[]>([]);
  const [sectorOpen, setSectorOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const sectorRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLDivElement>(null);
  const tickerRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('subscriber_token');
    if (token) {
      fetch('/api/subscriber/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
          if (!d.success) return;

          setSub(d.data.subscriber);
          const now = Date.now();
          const activeIds = (d.data.products as SubProduct[] | undefined ?? [])
            .filter(product => product.isActive && new Date(product.expiryDate).getTime() > now)
            .map(product => product.product?._id)
            .filter((productId): productId is string => Boolean(productId));
          setUnlockedProductIds(activeIds);
        })
        .catch(() => {});
    }
    fetch('/api/public/sectors')
      .then(r => r.json())
      .then(d => { if (d.success) setSectors(d.data); })
      .catch(() => {});
    fetch('/api/public/products')
      .then(r => r.json())
      .then(d => { if (d.success) setProducts(d.data); })
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

  useEffect(() => {
    const el = tickerRef.current;
    if (!el) return;
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    script.text = JSON.stringify({
      symbols: [
        { proName: 'ASX:CBA', title: 'CBA' },
        { proName: 'ASX:BHP', title: 'BHP' },
        { proName: 'ASX:REA', title: 'REA' },
        { proName: 'ASX:PNV', title: 'PNV' },
        { proName: 'ASX:LKE', title: 'LKE' },
        { proName: 'ASX:BC8', title: 'BC8' },
        { proName: 'ASX:ANZ', title: 'ANZ' },
        { proName: 'ASX:NAB', title: 'NAB' },
        { proName: 'ASX:WBC', title: 'WBC' },
        { proName: 'ASX:CSL', title: 'CSL' },
      ],
      showSymbolLogo: false,
      isTransparent: true,
      displayMode: 'adaptive',
      colorTheme: 'light',
      locale: 'en',
    });
    el.appendChild(script);
    return () => { el.innerHTML = ''; };
  }, []);

  const logout = () => {
    localStorage.removeItem('subscriber_token');
    localStorage.removeItem('subscriber_user');
    setSub(null);
    setUnlockedProductIds([]);
    window.location.href = '/';
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
  };

  const goLogin = () => {
    window.location.href = '/auth/login';
  };

  const unlockedProducts = new Set(unlockedProductIds);

  const ProductLock = ({ productId }: { productId: string }) => (
    unlockedProducts.has(productId) ? null : (
      <span className="nav-product-lock" aria-label="Subscription required" title="Subscription required">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="5" y="10" width="14" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      </span>
    )
  );

  return (
    <>
      <style>{`
        @keyframes navPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        .hn-link-highlight {
          color: #ff6464 !important;
          animation: navPulse 1.4s ease-in-out infinite;
          font-style: italic;
        }
        .hn-link-highlight:hover { opacity: 1 !important; }
      `}</style>
      <header className="site-header">
        <div className="header-main">
          <div className="container">
            <div className="header-main-inner d-flex align-items-center flex-wrap flex-lg-nowrap gap-3 gap-xl-4 pt-3">
              <Link href="/" className="header-logo flex-shrink-0">
                <picture>
                  <source media="(max-width: 991px)" srcSet="/logo2.png" />
                  <img src="/logo.png" alt="Pristine Gaze" />
                </picture>
              </Link>

              <form className="header-search d-flex flex-grow-1 order-3 order-lg-0 w-100" onSubmit={handleSearch}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  aria-label="Search"
                  className="header-search-input"
                />
                <button type="submit" className="header-search-btn flex-shrink-0" aria-label="Search">
                  <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10.8" cy="10.8" r="6.8"/><line x1="16.1" y1="16.1" x2="22" y2="22"/></svg>
                </button>
              </form>

              <div className="header-actions d-flex align-items-center gap-3 ms-lg-auto">
                {sub ? (
                  <div className="nav-header-actions d-flex align-items-center gap-2">
                    <Link href="/user/dashboard" className="header-account-btn">My Account</Link>
                    <button onClick={logout} className="header-signout-btn">Sign out</button>
                  </div>
                ) : (
                  <button type="button" onClick={goLogin} className="header-account-btn">Log-in</button>
                )}

                <div className="header-contact-card d-none d-xl-grid" aria-label="Contact details">
                  <a href="tel:0489990844" className="header-contact-phone">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11l-.95.95a16 16 0 0 0 8.32 8.32l.95-.95a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    <span>0489 990 844</span>
                  </a>
                  <a href="mailto:info@pristinegaze.com.au" className="header-contact-mail">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    <span>info@pristinegaze.com.au</span>
                  </a>
                </div>

                <button className="nav-hamburger ms-1" onClick={() => setMobileOpen(true)} aria-label="Open menu">
                  <span /><span /><span />
                </button>
              </div>
            </div>
          </div>
        </div>

        <nav className="header-nav">
          <div className="container">
            <div className="header-nav-inner d-flex align-items-center justify-content-center gap-3 gap-xl-4">
              <Link href="/" className={`hn-link ${pathname === '/' ? 'active' : ''}`}>Home</Link>
              <Link href="/about-us" className={`hn-link ${isActive('/about-us') ? 'active' : ''}`}>About Us</Link>

              <div ref={productRef} className="position-relative">
                <button
                  className={`hn-link hn-drop ${isActive('/subscribe') ? 'active' : ''}`}
                  onClick={() => { setProductOpen(o => !o); setSectorOpen(false); }}
                >
                  Product +
                </button>
                {productOpen && (
                  <div className="hn-dropdown hn-dropdown-wide nav-product-dropdown">
                    {products.length === 0 ? (
                      <div className="hn-dd-item hn-dd-disabled">No products yet</div>
                    ) : products.map(p => {
                      const unlocked = unlockedProducts.has(p._id);
                      const href = unlocked ? `/reports/${p.slug}` : `/subscribe/${p.slug}`;
                      return (
                        <Link
                          key={p._id}
                          href={href}
                          className={`hn-dd-item nav-product-item ${isActive(href) ? 'active' : ''}`}
                          onClick={() => setProductOpen(false)}
                        >
                          {p.featuredImage && <img src={p.featuredImage} alt="" className="nav-sector-img" />}
                          <span className="nav-product-name">{p.name}</span>
                          {unlocked
                            ? <span className="nav-product-unlocked" title="You have access">🔓</span>
                            : <ProductLock productId={p._id} />}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              <Link href="/subscribe" className={`hn-link ${isActive('/subscribe') && !isActive('/subscribe/') ? 'active' : ''}`}>Subscribe</Link>

              <div ref={sectorRef} className="position-relative">
                <button
                  className={`hn-link hn-drop ${isActive('/sectors') ? 'active' : ''}`}
                  onClick={() => { setSectorOpen(o => !o); setProductOpen(false); }}
                >
                  Sector +
                </button>
                {sectorOpen && (
                  <div className="hn-dropdown hn-dropdown-wide">
                    {sectors.length === 0 ? (
                      <div className="hn-dd-item hn-dd-disabled">No sectors yet</div>
                    ) : sectors.map(s => (
                      <Link
                        key={s._id}
                        href={`/sectors/${s.slug}`}
                        className={`hn-dd-item ${isActive(`/sectors/${s.slug}`) ? 'active' : ''}`}
                        onClick={() => setSectorOpen(false)}
                      >
                        {s.featuredImage && <img src={s.featuredImage} alt="" className="nav-sector-img" />}
                        {s.name}
                        <span className="nav-count-badge">{s.reportCount}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <Link href="/videos" className={`hn-link ${isActive('/videos') ? 'active' : ''}`}>Videos</Link>

              {blogTypes.map(bt => (
                <Link
                  key={bt._id}
                  href={`/${bt._id}`}
                  className={`hn-link ${isActive(`/${bt._id}`) ? 'active' : ''} ${bt.navHighlight ? 'hn-link-highlight' : ''}`}
                >
                  {bt.label || (bt._id ?? '').replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  {bt.navHighlight && <span className="hn-hot-badge">HOT</span>}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </header>
      <div className="header-ticker">
          <div className="tradingview-widget-container w-100" ref={tickerRef} />
        </div>

      <div className={`mobile-nav ${mobileOpen ? 'open' : ''}`}>
        <div className="mobile-nav-overlay" onClick={() => setMobileOpen(false)} />
        <div className="mobile-nav-panel">
          <button className="mobile-nav-close" onClick={() => setMobileOpen(false)}>x</button>

          <Link href="/" className={`mobile-nav-link ${pathname === '/' ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>Home</Link>
          <Link href="/about-us" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>About Us</Link>
          <Link href="/subscribe" className={`mobile-nav-link ${isActive('/subscribe') ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>Subscribe</Link>

          {products.length > 0 && (
            <>
              <div className="mobile-section-label">Products</div>
              {products.map(p => (
                <Link key={p._id} href={`/subscribe/${p.slug}`} className="mobile-nav-link mobile-nav-sub nav-product-item" onClick={() => setMobileOpen(false)}>
                  <span className="nav-product-name">{p.name}</span>
                  <ProductLock productId={p._id} />
                </Link>
              ))}
            </>
          )}

          {sectors.length > 0 && (
            <>
              <div className="mobile-section-label">Sectors</div>
              {sectors.map(s => (
                <Link key={s._id} href={`/sectors/${s.slug}`} className="mobile-nav-link mobile-nav-sub" onClick={() => setMobileOpen(false)}>
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
              {bt.navHighlight && <span className="mobile-hot-badge">HOT</span>}
            </Link>
          ))}

          <div className="mobile-auth-section">
            {sub ? (
              <>
                <Link href="/user/dashboard" className="header-account-btn d-block text-center" onClick={() => setMobileOpen(false)}>My Dashboard</Link>
                <button onClick={logout} className="mobile-signout-btn">Sign Out</button>
              </>
            ) : (
              <button type="button" onClick={() => { setMobileOpen(false); goLogin(); }} className="header-account-btn w-100">Login / My Account</button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

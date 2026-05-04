'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

interface UserData { name: string; email: string; }

const navItems = [
  { href: '/user/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/user/subscriptions', icon: '📦', label: 'My Subscriptions' },
  { href: '/user/transactions', icon: '💳', label: 'Transactions' },
  { href: '/user/profile', icon: '👤', label: 'Profile' },
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserData | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('subscriber_token');
    if (!token) { router.replace('/auth/login'); return; }
    fetch('/api/subscriber/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) { setUser(d.data.subscriber); }
        else { localStorage.removeItem('subscriber_token'); localStorage.removeItem('subscriber_user'); router.replace('/auth/login'); }
      })
      .catch(() => router.replace('/auth/login'))
      .finally(() => setChecking(false));
  }, [router]);

  const logout = () => {
    localStorage.removeItem('subscriber_token');
    localStorage.removeItem('subscriber_user');
    router.push('/');
  };

  if (checking) return (
    <div className="portal-body d-flex align-items-center justify-content-center">
      <div className="page-loading">
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔭</div>
        <div>Loading your account...</div>
      </div>
    </div>
  );

  const initials = user?.name?.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <div className="site-body">
      {/* Top nav */}
      <nav className="portal-nav">
        <div className="container">
          <div className="portal-nav-inner">
            <Link href="/" className="portal-nav-brand">
              <span>🔭</span> PristineGaze
            </Link>
            <div className="portal-nav-links d-none d-md-flex">
              <Link href="/" className="portal-nav-link">Home</Link>
              <Link href="/subscribe" className="portal-nav-link">Subscribe</Link>
              <Link href="/videos" className="portal-nav-link">Videos</Link>
            </div>
            <div className="portal-nav-actions d-flex align-items-center gap-2">
              <div className="user-avatar-sm">{initials}</div>
              <span className="d-none d-sm-inline" style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
                {user?.name?.split(' ')[0]}
              </span>
              <button onClick={logout} className="portal-signout-btn">Sign out</button>
            </div>
          </div>
        </div>
      </nav>

      {/* Portal header */}
      <div className="portal-header">
        <div className="container">
          <div className="portal-header-top">
            <div>
              <div className="portal-header-label">Subscriber Portal</div>
              <div className="portal-header-title">My Account</div>
            </div>
            <Link href="/subscribe" className="portal-new-btn">+ New Subscription</Link>
          </div>

          <div className="portal-tabs">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`portal-tab ${pathname === item.href ? 'active' : ''}`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="portal-body">
        <div className="container">
          {children}
        </div>
      </div>

      {/* Footer */}
      <footer className="portal-footer">
        <div className="container">
          <div className="row g-4">
            <div className="col-md-5">
              <div className="portal-nav-brand d-inline-flex mb-2"><span>🔭</span> PristineGaze</div>
              <p className="portal-footer-desc">
                Australia&apos;s premier investment research platform delivering daily market intelligence.
              </p>
            </div>
            <div className="col-md-3">
              <div className="portal-footer-section-title">My Account</div>
              {navItems.map(n => (
                <Link key={n.href} href={n.href} className="portal-footer-link">{n.label}</Link>
              ))}
            </div>
            <div className="col-md-4 text-md-end">
              <p className="portal-footer-desc mt-0">
                🇦🇺 Australian Investment Research<br />
                Market analysis &amp; sector insights
              </p>
            </div>
          </div>
          <div className="portal-footer-copy">
            © {new Date().getFullYear()} PristineGaze. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

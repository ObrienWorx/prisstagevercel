'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import SiteLayout from '@/components/SiteLayout';

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

  if (checking) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔭</div>
        <div style={{ fontSize: 14, color: '#64748b' }}>Loading your account...</div>
      </div>
    </div>
  );

  const initials = user?.name?.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <SiteLayout>
      {/* Portal header — sits below FrontNav, above content */}
      <div className="portal-header">
        <div className="container">
          <div className="portal-header-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="user-avatar-sm">{initials}</div>
              <div>
                <div className="portal-header-label">Subscriber Portal</div>
                <div className="portal-header-title">{user?.name || 'My Account'}</div>
              </div>
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

      {/* Page content */}
      <div className="portal-body">
        <div className="container">
          {children}
        </div>
      </div>
    </SiteLayout>
  );
}

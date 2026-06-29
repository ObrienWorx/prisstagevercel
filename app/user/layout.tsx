'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import SiteLayout from '@/components/SiteLayout';

interface UserData { name: string; email: string; }

const navItems = [
  { href: '/user/dashboard', label: 'Dashboard' },
  { href: '/user/subscriptions', label: 'My Subscriptions' },
  { href: '/user/portfolio', label: 'My Portfolio' },
  { href: '/user/profile', label: 'Profile' },
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserData | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('subscriber_token');
    if (!token) { router.replace('/member-account'); return; }
    fetch('/api/subscriber/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) { setUser(d.data.subscriber); }
        else { localStorage.removeItem('subscriber_token'); localStorage.removeItem('subscriber_user'); router.replace('/member-account'); }
      })
      .catch(() => router.replace('/member-account'))
      .finally(() => setChecking(false));
  }, [router]);

  if (checking) return (
    <div className="portal-checking">
      <div className="portal-checking-body">
        <div className="portal-checking-text">Loading your account...</div>
      </div>
    </div>
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name.split(' ')[0] ?? 'there';

  return (
    <SiteLayout>
      <div className="portal-header">
        <div className="container">
          <div className="portal-header-top">
            <div className="portal-header-user">
              <div className="user-avatar-sm"></div>
              <div>
                <div className="portal-header-label text-white">          {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <h2 className="welcome-banner-title text-white">{greeting}, {firstName} 👋</h2>
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
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="portal-body">
        <div className="container">
          {children}
        </div>
      </div>
    </SiteLayout>
  );
}

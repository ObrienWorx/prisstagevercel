'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface User { name: string; email: string; role: string; permissions: string[]; }
interface NavItem { label: string; href: string; icon: string; module: string | null; }
interface NavSection { label: string; items: NavItem[]; }

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: '▦', module: null },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'Blog Categories', href: '/dashboard/blog-categories', icon: '📁', module: 'blog-categories' },
      { label: 'Report Categories', href: '/dashboard/report-categories', icon: '📊', module: 'report-categories' },
      { label: 'Sectors', href: '/dashboard/sectors', icon: '🏭', module: 'sectors' },
      { label: 'Blogs', href: '/dashboard/blogs', icon: '✍️', module: 'blogs' },
      { label: 'Reports', href: '/dashboard/reports', icon: '📈', module: 'reports' },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { label: 'Products', href: '/dashboard/products', icon: '📦', module: 'products' },
      { label: 'Orders', href: '/dashboard/orders', icon: '🛍️', module: 'orders' },
      { label: 'Transactions', href: '/dashboard/transactions', icon: '💳', module: 'transactions' },
      { label: 'Videos', href: '/dashboard/videos', icon: '🎥', module: 'videos' },
    ],
  },
  {
    label: 'Users',
    items: [
      { label: 'Admin Users', href: '/dashboard/users', icon: '⭐', module: 'users' },
      { label: 'Subscribers', href: '/dashboard/subscribers', icon: '👤', module: 'subscribers' },
    ],
  },
  {
    label: 'Site',
    items: [
      { label: 'Static Pages', href: '/dashboard/static-pages', icon: '📄', module: null },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    setUser(JSON.parse(stored));
  }, [router]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.clear();
    router.push('/login');
  };

  const canSee = (module: string | null) => {
    if (!module) return true;
    if (user?.role === 'admin') return true;
    return user?.permissions.includes(module) ?? false;
  };

  const activeHref = NAV_SECTIONS.flatMap(s => s.items).find(n =>
    pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(n.href))
  )?.href;

  const activeLabel = NAV_SECTIONS.flatMap(s => s.items).find(n =>
    pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(n.href))
  )?.label || 'Dashboard';

  if (!user) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" />
      </div>
    );
  }

  return (
    <div>
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-name">
            <span>🔭</span> PristineGaze
          </div>
          <div className="brand-sub">Admin Panel</div>
        </div>

        {NAV_SECTIONS.map((section) => {
          const visible = section.items.filter(item => canSee(item.module));
          if (!visible.length) return null;
          return (
            <div key={section.label}>
              <div className="sidebar-section">{section.label}</div>
              <ul className="nav-list">
                {visible.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  return (
                    <li key={item.href} className="nav-item">
                      <Link href={item.href} className={`nav-link ${isActive ? 'active' : ''}`}>
                        <span className="nav-icon">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar">{user.name.charAt(0).toUpperCase()}</div>
            <div style={{ overflow: 'hidden' }}>
              <div className="u-name text-truncate">{user.name}</div>
              <div className="u-role">{user.role === 'admin' ? '⭐ Admin' : '👤 Sub-Admin'}</div>
            </div>
          </div>
          <button
            className="btn btn-sm w-100 mt-2"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: 'none', fontSize: 12 }}
            onClick={logout}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="main-content">
        <header className="topbar">
          <span className="page-title">{activeLabel}</span>
          <div className="topbar-right">
            <span className="badge bg-primary-subtle text-primary" style={{ borderRadius: 20, padding: '0.35em 0.8em', fontSize: 12 }}>
              {user.role === 'admin' ? '⭐ Admin' : '👤 Sub-Admin'}
            </span>
          </div>
        </header>
        <div className="page-content">{children}</div>
      </div>
    </div>
  );
}

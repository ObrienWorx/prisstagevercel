'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import GlobalSearch from '@/components/GlobalSearch';
import AdminClock from '@/components/AdminClock';

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
    label: 'Blog',
    items: [
      { label: 'Blog Categories', href: '/dashboard/blog-categories', icon: '📁', module: 'blog-categories' },
      { label: 'Blogs', href: '/dashboard/blogs', icon: '✍️', module: 'blogs' },
    ],
  },
  {
    label: 'Research & Reports',
    items: [
      { label: 'Products', href: '/dashboard/products', icon: '📦', module: 'products' },
      { label: 'Sectors', href: '/dashboard/sectors', icon: '🏭', module: 'sectors' },
      { label: 'Report Categories', href: '/dashboard/report-categories', icon: '📊', module: 'report-categories' },
      { label: 'Reports', href: '/dashboard/reports', icon: '📈', module: 'reports' },
    ],
  },
  {
    label: 'Media & Pages',
    items: [
      { label: 'Homepage Settings', href: '/dashboard/homepage-settings', icon: '⚙', module: null },
      { label: 'Expert Picks', href: '/dashboard/picks', icon: '🎯', module: null },
      { label: 'Videos', href: '/dashboard/videos', icon: '🎥', module: 'videos' },
      { label: 'Static Pages', href: '/dashboard/static-pages', icon: '📄', module: null },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { label: 'Orders', href: '/dashboard/orders', icon: '🛍️', module: 'orders' },
      { label: 'Transactions', href: '/dashboard/transactions', icon: '💳', module: 'transactions' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { label: 'Leads', href: '/dashboard/leads', icon: '📋', module: null },
    ],
  },
  {
    label: 'Users',
    items: [
      { label: 'Admin Users', href: '/dashboard/users', icon: '⭐', module: 'users' },
      { label: 'Subscribers', href: '/dashboard/subscribers', icon: '👤', module: 'subscribers' },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const clearAdminSession = useCallback(async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('admin_token');
    setUser(null);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    router.replace('/OnlyAdminPanel');
  }, [router]);

  const verifyAdminSession = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      await clearAdminSession();
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        await clearAdminSession();
        return;
      }

      const freshUser = data.data as User;
      localStorage.setItem('user', JSON.stringify(freshUser));
      setUser(freshUser);
    } catch {
      await clearAdminSession();
    }
  }, [clearAdminSession]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void verifyAdminSession(); }, 0);
    return () => { window.clearTimeout(timeout); };
  }, [pathname, verifyAdminSession]);

  useEffect(() => {
    const handleFocus = () => { void verifyAdminSession(); };
    const handleVisibilityChange = () => {
      if (!document.hidden) void verifyAdminSession();
    };
    const interval = window.setInterval(() => { void verifyAdminSession(); }, 60_000);

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [verifyAdminSession]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { setSidebarOpen(false); }, 0);
    return () => { window.clearTimeout(timeout); };
  }, [pathname]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('admin_token');
    setUser(null);
    router.replace('/OnlyAdminPanel');
  };

  const canSee = (module: string | null) => {
    if (!module) return true;
    if (user?.role === 'admin') return true;
    return user?.permissions.includes(module) ?? false;
  };

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
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-name">
            <img src="/logo.png" alt="" className='w-100' />
          </div>
        </div>

        <div className="sidebar-nav">
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
        </div>

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

      <div className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(o => !o)}
              aria-label="Toggle sidebar"
            >
              <span /><span /><span />
            </button>
            <span className="page-title">{activeLabel}</span>
          </div>
          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AdminClock />
            <GlobalSearch />
            <span className="badge bg-primary-subtle text-primary" style={{ borderRadius: 20, padding: '0.35em 0.8em', fontSize: 12, whiteSpace: 'nowrap' }}>
              {user.role === 'admin' ? '⭐ Admin' : '👤 Sub-Admin'}
            </span>
          </div>
        </header>
        <div className="page-content">{children}</div>
      </div>
    </div>
  );
}

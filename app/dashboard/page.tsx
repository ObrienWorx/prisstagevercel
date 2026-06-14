'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface User { name: string; role: string; permissions: string[]; }
interface Stats { reports: number; blogs: number; categories: number; products: number; sectors: number; users: number; }

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats>({ reports: 0, blogs: 0, categories: 0, products: 0, sectors: 0, users: 0 });

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch('/api/reports', { headers }),
      fetch('/api/blogs', { headers }),
      fetch('/api/categories', { headers }),
      fetch('/api/products', { headers }),
      fetch('/api/sectors', { headers }),
      fetch('/api/users', { headers }),
    ])
      .then((responses) => Promise.all(responses.map((r) => r.json())))
      .then(([r, b, c, p, s, u]) => {
        setStats({
          reports: r.success ? r.data.length : 0,
          blogs: b.success ? (b.data.total ?? b.data.length ?? 0) : 0,
          categories: c.success ? c.data.length : 0,
          products: p.success ? p.data.length : 0,
          sectors: s.success ? s.data.length : 0,
          users: u.success ? u.data.length : 0,
        });
      })
      .catch(() => {});
  }, []);

  const cards = [
    { label: 'Reports', value: stats.reports, icon: '📈', color: '#1a3c5e', href: '/dashboard/reports' },
    { label: 'Blogs', value: stats.blogs, icon: '✍️', color: '#2d6a9f', href: '/dashboard/blogs' },
    { label: 'Categories', value: stats.categories, icon: '📁', color: '#e8a020', href: '/dashboard/categories' },
    { label: 'Sectors', value: stats.sectors, icon: '🏭', color: '#6f42c1', href: '/dashboard/sectors' },
    { label: 'Products', value: stats.products, icon: '📦', color: '#28a745', href: '/dashboard/products' },
    { label: 'Users', value: stats.users, icon: '👥', color: '#dc3545', href: '/dashboard/users' },
  ];

  return (
    <div>
      <div className="mb-4">
        <h4 className="fw-bold">Welcome back, {user?.name}!</h4>
        <p className="text-muted">
          {user?.role === 'admin' ? 'Full admin access' : `Access: ${user?.permissions.join(', ') || 'none'}`}
        </p>
      </div>

      <div className="row g-4">
        {cards.map((card) => (
          <div key={card.label} className="col-md-4 col-sm-6">
            <Link href={card.href} className="text-decoration-none">
              <div className="card h-100 border-0 shadow-sm" style={{ cursor: 'pointer' }}>
                <div className="card-body d-flex align-items-center gap-3 p-4">
                  <div
                    className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 60, height: 60, backgroundColor: card.color + '20', fontSize: 28 }}
                  >
                    {card.icon}
                  </div>
                  <div>
                    <div className="h3 mb-0 fw-bold" style={{ color: card.color }}>{card.value}</div>
                    <div className="text-muted">{card.label}</div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

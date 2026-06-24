import SiteLayout from '@/components/SiteLayout';
import Link from 'next/link';

export default function NotFound() {
  return (
    <SiteLayout>
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 520 }}>
          <div style={{ fontSize: 80, lineHeight: 1, marginBottom: '1.5rem', opacity: 0.15, fontWeight: 900, color: '#0f172a', letterSpacing: '-4px' }}>
            404
          </div>
          <img src="/trend.png" alt="" style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: '1rem' }} />
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
            Page Not Found
          </h1>
          <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.7, marginBottom: '2rem' }}>
            We couldn&apos;t find what you were looking for. The page may have been moved, deleted, or never existed.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/"
              style={{ background: '#0f172a', color: '#fff', padding: '0.7rem 1.75rem', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}
            >
              ← Back to Home
            </Link>
            <Link
              href="/subscribe"
              style={{ background: '#f1f5f9', color: '#0f172a', padding: '0.7rem 1.75rem', borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: 'none', border: '1px solid #e2e8f0' }}
            >
              View Plans
            </Link>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

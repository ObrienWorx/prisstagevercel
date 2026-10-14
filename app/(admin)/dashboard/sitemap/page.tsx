'use client';

import { useState } from 'react';

export default function SitemapPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const download = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/sitemap', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate sitemap');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sitemap.xml';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid py-4" style={{ maxWidth: 600 }}>
      <h4 className="mb-1">Sitemap</h4>
      <p className="text-muted mb-4" style={{ fontSize: 14 }}>
        Generate and download a sitemap.xml covering all published blogs, reports, sectors, categories, and static pages.
      </p>

      {error && (
        <div className="alert alert-danger alert-dismissible mb-3" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')} />
        </div>
      )}

      <button
        className="btn btn-primary px-4"
        onClick={download}
        disabled={loading}
      >
        {loading ? (
          <>
            <span className="spinner-border spinner-border-sm me-2" />
            Generating...
          </>
        ) : (
          <>
            <i className="bi bi-download me-2" />
            Download sitemap.xml
          </>
        )}
      </button>
    </div>
  );
}

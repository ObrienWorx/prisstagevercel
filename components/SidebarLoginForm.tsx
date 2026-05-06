'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SidebarLoginForm({ redirectPath }: { redirectPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/subscriber/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('subscriber_token', data.data.token);
        localStorage.setItem('subscriber_user', JSON.stringify(data.data.user));
        router.refresh();
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Already a subscriber?</div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Sign in to read this report.</div>

      {error && (
        <div style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', borderRadius: 8, padding: '0.5rem 0.75rem', marginBottom: 12 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 10 }}>
          <input
            type="email"
            required
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: 13, outline: 'none', color: '#1e293b' }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: 13, outline: 'none', color: '#1e293b' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', background: '#0049AC', color: '#fff', border: 'none', borderRadius: 8, padding: '0.6rem', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: '#64748b' }}>
        <a href="/auth/forgot-password" style={{ color: '#3b82f6', textDecoration: 'none' }}>Forgot password?</a>
        {' · '}
        <a href={`/auth/register`} style={{ color: '#3b82f6', textDecoration: 'none' }}>Create account</a>
      </div>
    </div>
  );
}

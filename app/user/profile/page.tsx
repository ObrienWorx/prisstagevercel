'use client';

import { useEffect, useState } from 'react';

interface Subscriber { _id: string; name: string; email: string; phone?: string; createdAt: string; }

export default function ProfilePage() {
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [loading, setLoading] = useState(true);

  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('subscriber_token');
    if (!token) return;
    fetch('/api/subscriber/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setSubscriber(d.data.subscriber);
          setProfileForm({ name: d.data.subscriber.name, phone: d.data.subscriber.phone ?? '' });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name.trim()) { setProfileErr('Name is required'); return; }
    setProfileErr(''); setProfileMsg(''); setSavingProfile(true);
    const token = localStorage.getItem('subscriber_token');
    try {
      const r = await fetch('/api/subscriber/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: profileForm.name, phone: profileForm.phone }),
      });
      const d = await r.json();
      if (d.success) {
        setSubscriber(d.data);
        localStorage.setItem('subscriber_user', JSON.stringify(d.data));
        setProfileMsg('Profile updated successfully!');
      } else { setProfileErr(d.error || 'Failed to update profile'); }
    } catch { setProfileErr('Network error. Please try again.'); }
    finally { setSavingProfile(false); }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwForm.currentPassword) { setPwErr('Enter your current password'); return; }
    if (pwForm.newPassword.length < 6) { setPwErr('New password must be at least 6 characters'); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwErr('Passwords do not match'); return; }
    setPwErr(''); setPwMsg(''); setSavingPw(true);
    const token = localStorage.getItem('subscriber_token');
    try {
      const r = await fetch('/api/subscriber/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      });
      const d = await r.json();
      if (d.success) {
        setPwMsg('Password changed successfully!');
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else { setPwErr(d.error || 'Failed to change password'); }
    } catch { setPwErr('Network error. Please try again.'); }
    finally { setSavingPw(false); }
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  const initials = subscriber?.name?.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() || '?';
  const memberSince = subscriber?.createdAt
    ? new Date(subscriber.createdAt).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
    : '';

  return (
    <div>
      <div className="page-hdr">
        <h4>My Profile</h4>
        <p>Manage your account details and security</p>
      </div>

      <div className="row g-4 align-items-start">
        {/* Left — avatar card */}
        <div className="col-lg-4 d-flex flex-column gap-3">
          <div className="panel text-center p-4">
            <div className="user-avatar">{initials}</div>
            <div className="fw-bold mb-1" style={{ fontSize: 18, color: '#0f172a' }}>{subscriber?.name}</div>
            <div className="text-muted" style={{ fontSize: 13.5 }}>{subscriber?.email}</div>
            {subscriber?.phone && <div className="small mt-1" style={{ color: '#94a3b8' }}>{subscriber.phone}</div>}
            {memberSince && (
              <div className="mt-3 pt-3 border-top">
                <div className="meta-label">Member since</div>
                <div className="meta-value mt-1">{memberSince}</div>
              </div>
            )}
          </div>

          <div className="tip-box">
            <div className="tip-box-title">🔒 Account Security</div>
            <ul>
              <li>Use a strong unique password</li>
              <li>Keep your email up to date</li>
              <li>Never share your credentials</li>
            </ul>
          </div>
        </div>

        {/* Right — forms */}
        <div className="col-lg-8 d-flex flex-column gap-4">
          {/* Profile form */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">Personal Information</div>
              <div className="panel-sub">Update your name and contact details</div>
            </div>
            <form onSubmit={saveProfile} className="panel-body">
              {profileMsg && <div className="alert-inline alert-inline-success">✓ {profileMsg}</div>}
              {profileErr && <div className="alert-inline alert-inline-danger">{profileErr}</div>}
              <div className="row g-3 mb-3">
                <div className="col-sm-6">
                  <label className="form-label">Full Name <span className="text-danger">*</span></label>
                  <input className="form-control" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} placeholder="John Smith" />
                </div>
                <div className="col-sm-6">
                  <label className="form-label">Phone Number</label>
                  <input type="tel" className="form-control" value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="+61 4xx xxx xxx" />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Email Address</label>
                <input type="email" className="form-control" value={subscriber?.email ?? ''} disabled />
                <div className="form-text">Email cannot be changed. Contact support if needed.</div>
              </div>
              <button type="submit" disabled={savingProfile} className="btn btn-dark">
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Password form */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">Change Password</div>
              <div className="panel-sub">Keep your account secure with a strong password</div>
            </div>
            <form onSubmit={savePassword} className="panel-body">
              {pwMsg && <div className="alert-inline alert-inline-success">✓ {pwMsg}</div>}
              {pwErr && <div className="alert-inline alert-inline-danger">{pwErr}</div>}
              <div className="mb-3">
                <label className="form-label">Current Password</label>
                <input type="password" className="form-control" value={pwForm.currentPassword} autoComplete="current-password" onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} placeholder="Enter current password" />
              </div>
              <div className="row g-3 mb-3">
                <div className="col-sm-6">
                  <label className="form-label">New Password</label>
                  <input type="password" className="form-control" value={pwForm.newPassword} autoComplete="new-password" onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} placeholder="Min 6 characters" />
                </div>
                <div className="col-sm-6">
                  <label className="form-label">Confirm New Password</label>
                  <input type="password" className="form-control" value={pwForm.confirmPassword} autoComplete="new-password" onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} placeholder="Repeat new password" />
                </div>
              </div>
              <button type="submit" disabled={savingPw} className="btn btn-danger">
                {savingPw ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

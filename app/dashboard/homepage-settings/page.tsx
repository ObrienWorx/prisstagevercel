'use client';

import { useCallback, useEffect, useState } from 'react';
import ImageUpload from '@/components/ImageUpload';

interface HomepageSettings {
  _id?: string;
  heroImage: string;
  videoSectionTitle: string;
  videoSectionDescription: string;
  videoSectionButtonText: string;
  videoSectionButtonHref: string;
  videoSectionYoutubeUrl: string;
}

const defaultSettings: HomepageSettings = {
  heroImage: '',
  videoSectionTitle: 'Watch. Learn. Invest Smarter.',
  videoSectionDescription: 'Don’t miss out on the latest market updates and expert tips! Watch our videos for in-depth ASX stock analysis, daily trends, and strategies to grow your portfolio. Stay informed, stay ahead—click play and take the first step towards smarter investing today!',
  videoSectionButtonText: 'Show All Videos',
  videoSectionButtonHref: '/videos',
  videoSectionYoutubeUrl: '',
};

export default function HomepageSettingsPage() {
  const [settings, setSettings] = useState<HomepageSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const load = useCallback(async () => {
    const token = localStorage.getItem('token') || '';
    setLoading(true);
    setErr('');
    try {
      const res = await fetch('/api/homepage-settings', {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setSettings({
        heroImage: data.data?.heroImage ?? '',
        videoSectionTitle: data.data?.videoSectionTitle ?? defaultSettings.videoSectionTitle,
        videoSectionDescription: data.data?.videoSectionDescription ?? defaultSettings.videoSectionDescription,
        videoSectionButtonText: data.data?.videoSectionButtonText ?? defaultSettings.videoSectionButtonText,
        videoSectionButtonHref: data.data?.videoSectionButtonHref ?? defaultSettings.videoSectionButtonHref,
        videoSectionYoutubeUrl: data.data?.videoSectionYoutubeUrl ?? '',
      });
      else setErr(data.error || 'Unable to load homepage settings');
    } catch {
      setErr('Unable to load homepage settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const save = async () => {
    setSaving(true);
    setErr('');
    setOk('');
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/homepage-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setSettings({
          heroImage: data.data?.heroImage ?? '',
          videoSectionTitle: data.data?.videoSectionTitle ?? defaultSettings.videoSectionTitle,
          videoSectionDescription: data.data?.videoSectionDescription ?? defaultSettings.videoSectionDescription,
          videoSectionButtonText: data.data?.videoSectionButtonText ?? defaultSettings.videoSectionButtonText,
          videoSectionButtonHref: data.data?.videoSectionButtonHref ?? defaultSettings.videoSectionButtonHref,
          videoSectionYoutubeUrl: data.data?.videoSectionYoutubeUrl ?? '',
        });
        setOk(data.message || 'Homepage settings saved');
        setTimeout(() => setOk(''), 3000);
      } else {
        setErr(data.error || 'Save failed');
      }
    } catch {
      setErr('Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h4>Homepage Settings</h4>
          <p>Manage the homepage hero area. More settings can be added here later.</p>
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving || loading}>
          {saving && <span className="spinner-border spinner-border-sm me-2" />}
          Save Settings
        </button>
      </div>

      {ok && <div className="alert alert-success mb-4">✓ {ok}</div>}
      {err && <div className="alert alert-danger mb-4">{err}</div>}

      <div className="card">
        {loading ? (
          <div className="text-center p-5"><div className="spinner-border text-primary" /></div>
        ) : (
          <div className="card-body">
            <div className="row g-4">
              <div className="col-lg-6">
                <div className="form-section-title mb-3">Hero Image</div>
                <ImageUpload
                  label="Homepage hero image"
                  value={settings.heroImage}
                  onChange={(url) => setSettings(prev => ({ ...prev, heroImage: url }))}
                />
                <div className="form-text mt-2">
                  This image appears in the large outlined hero box on the homepage.
                </div>
              </div>

              <div className="col-lg-6">
                <div className="form-section-title mb-3">Preview</div>
                <div className="homepage-setting-preview">
                  {settings.heroImage ? (
                    <img src={settings.heroImage} alt="Homepage hero preview" />
                  ) : (
                    <div className="homepage-setting-preview-empty">No hero image selected</div>
                  )}
                </div>
              </div>
            </div>

            <div className="row g-4 mt-4">
              <div className="col-12"><hr /><div className="form-section-title mb-3">Video Promo Section</div></div>
              <div className="col-md-6">
                <label className="form-label">Title</label>
                <input
                  className="form-control"
                  value={settings.videoSectionTitle}
                  onChange={(e) => setSettings(prev => ({ ...prev, videoSectionTitle: e.target.value }))}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">YouTube URL</label>
                <input
                  className="form-control"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={settings.videoSectionYoutubeUrl}
                  onChange={(e) => setSettings(prev => ({ ...prev, videoSectionYoutubeUrl: e.target.value }))}
                />
              </div>
              <div className="col-12">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={settings.videoSectionDescription}
                  onChange={(e) => setSettings(prev => ({ ...prev, videoSectionDescription: e.target.value }))}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Button Text</label>
                <input
                  className="form-control"
                  value={settings.videoSectionButtonText}
                  onChange={(e) => setSettings(prev => ({ ...prev, videoSectionButtonText: e.target.value }))}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Button Link</label>
                <input
                  className="form-control"
                  value={settings.videoSectionButtonHref}
                  onChange={(e) => setSettings(prev => ({ ...prev, videoSectionButtonHref: e.target.value }))}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

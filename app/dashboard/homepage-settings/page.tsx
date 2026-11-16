'use client';

import { useCallback, useEffect, useState } from 'react';
import ImageUpload from '@/components/ImageUpload';
import PdfUpload from '@/components/PdfUpload';

interface HeroSlide {
  image: string;
  title: string;
  link: string;
}

interface HomepageSettings {
  _id?: string;
  heroSlides: HeroSlide[];
  videoSectionTitle: string;
  videoSectionDescription: string;
  videoSectionButtonText: string;
  videoSectionButtonHref: string;
  videoSectionYoutubeUrl: string;
  tickerLeadPdf: string;
  blogLeadPdf: string;
  blogPopupTitle: string;
  blogPopupButtonText: string;
  blogPopupSuccessText: string;
  blogPromoHeading: string;
  blogPromoLead: string;
  blogPromoSubtitle: string;
  blogPromoItems: string[];
  blogPromoButtonText: string;
  blogPromoPopupTitle: string;
  blogPromoPopupButtonText: string;
  blogPromoPopupSuccessText: string;
}

const defaultSettings: HomepageSettings = {
  heroSlides: [],
  videoSectionTitle: "Watch. Learn. Invest Smarter.",
  videoSectionDescription: "Don't miss out on the latest market updates and expert tips! Watch our videos for in-depth ASX stock analysis, daily trends, and strategies to grow your portfolio. Stay informed, stay ahead—click play and take the first step towards smarter investing today!",
  videoSectionButtonText: 'Show All Videos',
  videoSectionButtonHref: '/videos',
  videoSectionYoutubeUrl: '',
  tickerLeadPdf: '',
  blogLeadPdf: '',
  blogPopupTitle: 'Please fill the details to Unlock the Exclusive ASX Stock Report',
  blogPopupButtonText: 'Unlock the Ticker',
  blogPopupSuccessText: 'You will receive the detailed Stock Report on your submitted email.',
  blogPromoHeading: 'Some ASX Opportunities Are Still Flying Under the Radar.',
  blogPromoLead: 'Download our Complimentary Research Report featuring 5 ASX-listed companies poised to grow this year.',
  blogPromoSubtitle: "What's in the Complimentary Report?",
  blogPromoItems: [
    '5 high-potential ASX stocks selected by our experts',
    'Technical and fundamental analysis explained in a simple format',
    'General research opinions and market outlook on each company',
    'Key business highlights, sector trends, and growth drivers',
    'Insights designed to help investors make more informed decisions',
  ],
  blogPromoButtonText: 'Claim your Free Copy',
  blogPromoPopupTitle: 'Please fill the details to Unlock the Exclusive ASX Stock Report',
  blogPromoPopupButtonText: 'Unlock the Report',
  blogPromoPopupSuccessText: 'You will receive the detailed Stock Report on your submitted email.',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromApi(d: any): HomepageSettings {
  const slides: HeroSlide[] = Array.isArray(d?.heroSlides) && d.heroSlides.length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? d.heroSlides.map((s: any) => ({ image: s?.image ?? '', title: s?.title ?? '', link: s?.link ?? '' }))
    : (d?.heroImage ? [{ image: d.heroImage, title: '', link: '' }] : []);
  return {
    heroSlides: slides,
    videoSectionTitle: d?.videoSectionTitle ?? defaultSettings.videoSectionTitle,
    videoSectionDescription: d?.videoSectionDescription ?? defaultSettings.videoSectionDescription,
    videoSectionButtonText: d?.videoSectionButtonText ?? defaultSettings.videoSectionButtonText,
    videoSectionButtonHref: d?.videoSectionButtonHref ?? defaultSettings.videoSectionButtonHref,
    videoSectionYoutubeUrl: d?.videoSectionYoutubeUrl ?? '',
    tickerLeadPdf: d?.tickerLeadPdf ?? '',
    blogLeadPdf: d?.blogLeadPdf ?? '',
    blogPopupTitle: d?.blogPopupTitle ?? defaultSettings.blogPopupTitle,
    blogPopupButtonText: d?.blogPopupButtonText ?? defaultSettings.blogPopupButtonText,
    blogPopupSuccessText: d?.blogPopupSuccessText ?? defaultSettings.blogPopupSuccessText,
    blogPromoHeading: d?.blogPromoHeading ?? defaultSettings.blogPromoHeading,
    blogPromoLead: d?.blogPromoLead ?? defaultSettings.blogPromoLead,
    blogPromoSubtitle: d?.blogPromoSubtitle ?? defaultSettings.blogPromoSubtitle,
    blogPromoItems: Array.isArray(d?.blogPromoItems) && d.blogPromoItems.length ? d.blogPromoItems : defaultSettings.blogPromoItems,
    blogPromoButtonText: d?.blogPromoButtonText ?? defaultSettings.blogPromoButtonText,
    blogPromoPopupTitle: d?.blogPromoPopupTitle ?? defaultSettings.blogPromoPopupTitle,
    blogPromoPopupButtonText: d?.blogPromoPopupButtonText ?? defaultSettings.blogPromoPopupButtonText,
    blogPromoPopupSuccessText: d?.blogPromoPopupSuccessText ?? defaultSettings.blogPromoPopupSuccessText,
  };
}

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
      if (data.success) setSettings(fromApi(data.data));
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
        setSettings(fromApi(data.data));
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

  const updateSlide = (i: number, patch: Partial<HeroSlide>) =>
    setSettings(prev => ({ ...prev, heroSlides: prev.heroSlides.map((s, idx) => idx === i ? { ...s, ...patch } : s) }));
  const addSlide = () =>
    setSettings(prev => ({ ...prev, heroSlides: [...prev.heroSlides, { image: '', title: '', link: '' }] }));
  const removeSlide = (i: number) =>
    setSettings(prev => ({ ...prev, heroSlides: prev.heroSlides.filter((_, idx) => idx !== i) }));
  const moveSlide = (i: number, dir: -1 | 1) =>
    setSettings(prev => {
      const next = [...prev.heroSlides];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...prev, heroSlides: next };
    });

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
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="form-section-title mb-0">Hero Slider</div>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={addSlide}>+ Add Slide</button>
            </div>
            <div className="form-text mb-3">
              Slides rotate in the large hero box on the homepage. Each slide can have an optional title and a link (clicking the slide opens it).
            </div>

            {settings.heroSlides.length === 0 ? (
              <div className="alert alert-light border text-center text-muted">
                No slides yet. Click <strong>+ Add Slide</strong> to create one.
              </div>
            ) : (
              <div className="row g-4">
                {settings.heroSlides.map((slide, i) => (
                  <div className="col-12" key={i}>
                    <div className="border rounded-3 p-3">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <span className="fw-semibold">Slide {i + 1}</span>
                        <div className="d-flex gap-1">
                          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => moveSlide(i, -1)} disabled={i === 0} title="Move up">↑</button>
                          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => moveSlide(i, 1)} disabled={i === settings.heroSlides.length - 1} title="Move down">↓</button>
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeSlide(i)} title="Remove">✕</button>
                        </div>
                      </div>
                      <div className="row g-3">
                        <div className="col-lg-5">
                          <ImageUpload
                            label="Slide image"
                            value={slide.image}
                            onChange={(url) => updateSlide(i, { image: url })}
                          />
                        </div>
                        <div className="col-lg-7">
                          <label className="form-label">Title <span className="text-muted">(optional)</span></label>
                          <input
                            className="form-control mb-3"
                            placeholder="e.g. Diwali Special Offer"
                            value={slide.title}
                            onChange={(e) => updateSlide(i, { title: e.target.value })}
                          />
                          <label className="form-label">Link <span className="text-muted">(optional)</span></label>
                          <input
                            className="form-control"
                            placeholder="https://… or /subscribe"
                            value={slide.link}
                            onChange={(e) => updateSlide(i, { link: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

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

            <div className="row g-4 mt-4">
              <div className="col-12"><hr /><div className="form-section-title mb-1">Lead Magnet Reports</div></div>
              <div className="col-md-6">
                <PdfUpload label="Ticker Report PDF" value={settings.tickerLeadPdf} onChange={(u) => setSettings(prev => ({ ...prev, tickerLeadPdf: u }))} />
              </div>
              <div className="col-md-6">
                <PdfUpload label="Blog Category Report PDF" value={settings.blogLeadPdf} onChange={(u) => setSettings(prev => ({ ...prev, blogLeadPdf: u }))} />
              </div>
            </div>

            {/* ── Blog Popup ── */}
            <div className="row g-4 mt-4">
              <div className="col-12"><hr /><div className="form-section-title mb-1">Blog Page Popup (Auto popup on scroll/timer)</div></div>
              <div className="col-12">
                <label className="form-label">Popup Title</label>
                <input className="form-control" value={settings.blogPopupTitle} onChange={e => setSettings(prev => ({ ...prev, blogPopupTitle: e.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Button Text</label>
                <input className="form-control" value={settings.blogPopupButtonText} onChange={e => setSettings(prev => ({ ...prev, blogPopupButtonText: e.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Success Message</label>
                <input className="form-control" value={settings.blogPopupSuccessText} onChange={e => setSettings(prev => ({ ...prev, blogPopupSuccessText: e.target.value }))} />
              </div>
            </div>

            {/* ── Blog Sidebar Promo ── */}
            <div className="row g-4 mt-4">
              <div className="col-12"><hr /><div className="form-section-title mb-1">Blog Sidebar Promo Box</div></div>
              <div className="col-12">
                <label className="form-label">Heading</label>
                <input className="form-control" value={settings.blogPromoHeading} onChange={e => setSettings(prev => ({ ...prev, blogPromoHeading: e.target.value }))} />
              </div>
              <div className="col-12">
                <label className="form-label">Lead Text</label>
                <textarea className="form-control" rows={2} value={settings.blogPromoLead} onChange={e => setSettings(prev => ({ ...prev, blogPromoLead: e.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="form-label">List Section Title</label>
                <input className="form-control" value={settings.blogPromoSubtitle} onChange={e => setSettings(prev => ({ ...prev, blogPromoSubtitle: e.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Button Text</label>
                <input className="form-control" value={settings.blogPromoButtonText} onChange={e => setSettings(prev => ({ ...prev, blogPromoButtonText: e.target.value }))} />
              </div>
              <div className="col-12">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <label className="form-label mb-0">Bullet Points</label>
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setSettings(prev => ({ ...prev, blogPromoItems: [...prev.blogPromoItems, ''] }))}>+ Add Item</button>
                </div>
                <div className="d-flex flex-column gap-2">
                  {settings.blogPromoItems.map((item, i) => (
                    <div key={i} className="d-flex gap-2">
                      <input className="form-control" value={item} onChange={e => setSettings(prev => ({ ...prev, blogPromoItems: prev.blogPromoItems.map((v, idx) => idx === i ? e.target.value : v) }))} />
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setSettings(prev => ({ ...prev, blogPromoItems: prev.blogPromoItems.filter((_, idx) => idx !== i) }))}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Blog Sidebar Promo Popup ── */}
            <div className="row g-4 mt-4">
              <div className="col-12"><hr /><div className="form-section-title mb-1">Blog Sidebar Promo Popup (opens when clicking sidebar button)</div></div>
              <div className="col-12">
                <label className="form-label">Popup Title</label>
                <input className="form-control" value={settings.blogPromoPopupTitle} onChange={e => setSettings(prev => ({ ...prev, blogPromoPopupTitle: e.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Button Text</label>
                <input className="form-control" value={settings.blogPromoPopupButtonText} onChange={e => setSettings(prev => ({ ...prev, blogPromoPopupButtonText: e.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Success Message</label>
                <input className="form-control" value={settings.blogPromoPopupSuccessText} onChange={e => setSettings(prev => ({ ...prev, blogPromoPopupSuccessText: e.target.value }))} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useRef, useState } from 'react';

interface Props {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export default function ImageUpload({ value, onChange, label = 'Image' }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (data.success) onChange(data.url);
      else setError(data.error || 'Upload failed');
    } catch {
      setError('Upload failed. Try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <label className="form-label">{label}</label>
      <div
        className="image-upload-box"
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {value ? (
          <div className="position-relative w-100 h-100 p-2 d-flex align-items-center justify-content-center">
            <img
              src={value}
              alt="Preview"
              style={{ maxHeight: 160, maxWidth: '100%', objectFit: 'contain', borderRadius: 6 }}
            />
            <button
              type="button"
              className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1"
              style={{ width: 24, height: 24, padding: 0, fontSize: 12, borderRadius: 6 }}
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
            >✕</button>
          </div>
        ) : (
          <div className="text-center py-4 px-3">
            {uploading ? (
              <>
                <div className="spinner-border spinner-border-sm text-primary mb-2" />
                <div className="text-muted" style={{ fontSize: 12 }}>Uploading...</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
                <div className="fw-medium" style={{ fontSize: 13 }}>Click to upload</div>
                <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>JPG, PNG, WebP, SVG — max 5MB</div>
              </>
            )}
          </div>
        )}
      </div>
      {error && <div className="text-danger mt-1" style={{ fontSize: 12 }}>{error}</div>}
      <input ref={inputRef} type="file" accept="image/*" className="d-none" onChange={handleFile} />
    </div>
  );
}

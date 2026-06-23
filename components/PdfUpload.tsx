'use client';

import { useRef, useState } from 'react';

interface Props {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

// Upload a PDF (reuses /api/upload, which now accepts application/pdf). Shows the
// current file link with a remove button.
export default function PdfUpload({ value, onChange, label = 'PDF' }: Props) {
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
      {value ? (
        <div className="d-flex align-items-center gap-2 border rounded p-2">
          <span style={{ fontSize: 20 }}>📄</span>
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-truncate" style={{ flex: 1 }}>{value}</a>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => onChange('')}>Remove</button>
        </div>
      ) : (
        <div>
          <button type="button" className="btn btn-outline-secondary btn-sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? 'Uploading…' : 'Upload PDF'}
          </button>
          <span className="text-muted ms-2" style={{ fontSize: 11 }}>PDF — max 20MB</span>
        </div>
      )}
      {error && <div className="text-danger mt-1" style={{ fontSize: 12 }}>{error}</div>}
      <input ref={inputRef} type="file" accept="application/pdf" className="d-none" onChange={handleFile} />
    </div>
  );
}

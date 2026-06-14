'use client';

interface Props {
  page: number;
  pages: number;
  total?: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, pages, total, onChange }: Props) {
  if (pages <= 1) return null;
  return (
    <div className="d-flex align-items-center justify-content-between mt-3">
      <div className="text-muted small">
        Page {page} of {pages}{typeof total === 'number' ? ` · ${total} total` : ''}
      </div>
      <div className="d-flex gap-2">
        <button
          className="btn btn-sm btn-outline-secondary"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >Previous</button>
        <button
          className="btn btn-sm btn-outline-secondary"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >Next</button>
      </div>
    </div>
  );
}

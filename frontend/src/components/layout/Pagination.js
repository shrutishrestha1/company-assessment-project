import React from 'react';

export default function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, total, limit } = pagination;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const pages = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
    pages.push(i);
  }

  return (
    <div className="pagination">
      <span className="pagination-info">
        Showing {from}–{to} of {total} records
      </span>
      <div className="pagination-controls">
        <button className="page-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>‹</button>
        {pages[0] > 1 && (
          <>
            <button className="page-btn" onClick={() => onPageChange(1)}>1</button>
            {pages[0] > 2 && <span style={{ padding: '0 4px', color: 'var(--text-muted)' }}>…</span>}
          </>
        )}
        {pages.map((p) => (
          <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => onPageChange(p)}>{p}</button>
        ))}
        {pages[pages.length - 1] < totalPages && (
          <>
            {pages[pages.length - 1] < totalPages - 1 && <span style={{ padding: '0 4px', color: 'var(--text-muted)' }}>…</span>}
            <button className="page-btn" onClick={() => onPageChange(totalPages)}>{totalPages}</button>
          </>
        )}
        <button className="page-btn" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>›</button>
      </div>
    </div>
  );
}

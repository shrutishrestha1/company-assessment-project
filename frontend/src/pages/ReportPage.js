import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { transactionsAPI, sendersAPI, receiversAPI } from '../services/api';
import Pagination from '../components/layout/Pagination';
import Modal from '../components/layout/Modal';

const fmt = (n, d = 2) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

const STATUS_COLORS = { completed: 'badge-success', pending: 'badge-warning', failed: 'badge-danger', processing: 'badge-info', cancelled: 'badge-neutral' };

export default function ReportPage() {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [senders, setSenders] = useState([]);
  const [receivers, setReceivers] = useState([]);
  const [detail, setDetail] = useState(null);

  const [filters, setFilters] = useState({
    sender_id: '', receiver_id: '', date_from: '', date_to: '', status: '', reference_no: ''
  });

  useEffect(() => {
    sendersAPI.getAll({ limit: 200 }).then((r) => setSenders(r.data.data)).catch(() => {});
    receiversAPI.getAll({ limit: 200 }).then((r) => setReceivers(r.data.data)).catch(() => {});
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await transactionsAPI.getAll(params);
      setTransactions(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load transactions.'); }
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const setFilter = (k) => (e) => { setFilters((f) => ({ ...f, [k]: e.target.value })); setPage(1); };
  const clearFilters = () => { setFilters({ sender_id: '', receiver_id: '', date_from: '', date_to: '', status: '', reference_no: '' }); setPage(1); };

  const openDetail = async (id) => {
    try {
      const res = await transactionsAPI.getById(id);
      setDetail(res.data.data);
    } catch { toast.error('Failed to load transaction details.'); }
  };

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div>
      {/* Filters */}
      <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Reference No</label>
            <input className="form-input" style={{ padding: '7px 10px' }} placeholder="RMT-…" value={filters.reference_no} onChange={setFilter('reference_no')} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Sender</label>
            <select className="form-select" style={{ padding: '7px 10px' }} value={filters.sender_id} onChange={setFilter('sender_id')}>
              <option value="">All Senders</option>
              {senders.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Receiver</label>
            <select className="form-select" style={{ padding: '7px 10px' }} value={filters.receiver_id} onChange={setFilter('receiver_id')}>
              <option value="">All Receivers</option>
              {receivers.map((r) => <option key={r.id} value={r.id}>{r.full_name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>From Date</label>
            <input type="date" className="form-input" style={{ padding: '7px 10px' }} value={filters.date_from} onChange={setFilter('date_from')} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>To Date</label>
            <input type="date" className="form-input" style={{ padding: '7px 10px' }} value={filters.date_to} onChange={setFilter('date_to')} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Status</label>
            <select className="form-select" style={{ padding: '7px 10px' }} value={filters.status} onChange={setFilter('status')}>
              <option value="">All Statuses</option>
              {['pending', 'processing', 'completed', 'failed', 'cancelled'].map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
        {hasFilters && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Filters active</span>
            <button className="btn btn-secondary btn-sm" onClick={clearFilters}>Clear All</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          {loading ? (
            <div className="loading-overlay"><span className="spinner" /> Loading transactions…</div>
          ) : transactions.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📊</div><p>No transactions found</p><small>Try adjusting your filters</small></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th><th>Sender</th><th>Receiver</th>
                  <th>JPY Sent</th><th>NPR Converted</th><th>Service Fee</th>
                  <th>Status</th><th>Date</th><th></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td><span style={{ fontFamily: 'DM Mono', fontSize: 12, color: 'var(--accent)' }}>{t.reference_no}</span></td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{t.sender_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>🇯🇵 Japan</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{t.receiver_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>🇳🇵 {t.receiver_phone}</div>
                    </td>
                    <td className="amount-jpy">¥ {fmt(t.send_amount_jpy)}</td>
                    <td className="amount-npr">रु {fmt(t.converted_amount_npr)}</td>
                    <td className="amount-fee">रु {fmt(t.service_fee_npr)}</td>
                    <td><span className={`badge ${STATUS_COLORS[t.status] || 'badge-neutral'}`}>{t.status}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(t.created_at).toLocaleDateString()}<br />
                      {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => openDetail(t.id)}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>

      {/* Detail Modal */}
      {detail && (
        <Modal title="Transaction Details" onClose={() => setDetail(null)} size="md"
          footer={<button className="btn btn-secondary" onClick={() => setDetail(null)}>Close</button>}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontFamily: 'DM Mono', color: 'var(--accent)', fontSize: 14 }}>{detail.reference_no}</span>
              <span className={`badge ${STATUS_COLORS[detail.status] || 'badge-neutral'}`}>{detail.status}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {[
                { label: '🇯🇵 Sender', value: detail.sender_name, sub: detail.sender_email || detail.sender_phone },
                { label: '🇳🇵 Receiver', value: detail.receiver_name, sub: detail.receiver_phone },
              ].map((item) => (
                <div key={item.label} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontWeight: 600 }}>{item.value}</div>
                  {item.sub && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.sub}</div>}
                </div>
              ))}
            </div>

            {[
              { label: 'Amount Sent (JPY)', value: `¥ ${fmt(detail.send_amount_jpy)}`, color: 'var(--warning)' },
              { label: 'Forex Rate', value: `1 JPY = ${detail.forex_rate} NPR`, color: 'var(--text-secondary)' },
              { label: 'Converted (NPR)', value: `रु ${fmt(detail.converted_amount_npr)}`, color: 'var(--success)' },
              { label: 'Service Fee (NPR)', value: `रु ${fmt(detail.service_fee_npr)}`, color: 'var(--danger)' },
              { label: 'Total NPR', value: `रु ${fmt(detail.total_amount_npr)}`, color: 'var(--success)', bold: true },
            ].map((row) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)', fontSize: 14 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                <span style={{ fontFamily: 'DM Mono', fontWeight: row.bold ? 700 : 500, color: row.color, fontSize: row.bold ? 16 : 14 }}>{row.value}</span>
              </div>
            ))}

            {detail.bank_name && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>Bank: </span>
                <strong>{detail.bank_name}</strong>
                {detail.bank_account && <span style={{ fontFamily: 'DM Mono', color: 'var(--text-secondary)', marginLeft: 8 }}>{detail.bank_account}</span>}
              </div>
            )}

            {detail.remarks && (
              <div style={{ marginTop: 10, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                💬 {detail.remarks}
              </div>
            )}

            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
              Created: {new Date(detail.created_at).toLocaleString()} · By: {detail.created_by_name || '—'}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

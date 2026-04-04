import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { receiversAPI } from '../services/api';
import Modal from '../components/layout/Modal';
import Pagination from '../components/layout/Pagination';

const EMPTY = { full_name: '', email: '', phone: '', address: '', country: 'Nepal', bank_name: '', bank_account: '' };

export default function ReceiversPage() {
  const [receivers, setReceivers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const fetchReceivers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await receiversAPI.getAll({ page, limit: 10, search });
      setReceivers(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load receivers.'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchReceivers(); }, [fetchReceivers]);

  const openCreate = () => { setForm(EMPTY); setSelected(null); setModal('create'); };
  const openEdit = (r) => {
    setForm({ full_name: r.full_name, email: r.email || '', phone: r.phone, address: r.address || '', country: r.country || 'Nepal', bank_name: r.bank_name || '', bank_account: r.bank_account || '' });
    setSelected(r); setModal('edit');
  };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === 'create') { await receiversAPI.create(form); toast.success('Receiver created.'); }
      else { await receiversAPI.update(selected.id, form); toast.success('Receiver updated.'); }
      closeModal(); fetchReceivers();
    } catch (err) { toast.error(err.response?.data?.message || 'Operation failed.'); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (r) => {
    try {
      await receiversAPI.toggleStatus(r.id, !r.is_active);
      toast.success(`Receiver ${r.is_active ? 'deactivated' : 'activated'}.`);
      fetchReceivers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
  };

  const handleDelete = async (r) => {
    if (!window.confirm(`Delete receiver "${r.full_name}"?`)) return;
    try {
      await receiversAPI.delete(r.id);
      toast.success('Receiver deleted.');
      fetchReceivers();
    } catch (err) { toast.error(err.response?.data?.message || 'Cannot delete receiver.'); }
  };

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <div className="card" style={{ padding: 0 }}>
        <div className="filter-bar">
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input className="search-input" placeholder="Search receivers…" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Add Receiver</button>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="loading-overlay"><span className="spinner" /> Loading receivers…</div>
          ) : receivers.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📥</div><p>No receivers found</p></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Phone</th><th>Country</th><th>Bank Details</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {receivers.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.full_name}</strong>
                      {r.email && <><br /><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.email}</span></>}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{r.phone}</td>
                    <td>🇳🇵 {r.country}</td>
                    <td style={{ fontSize: 12 }}>
                      {r.bank_name ? (
                        <>
                          <div style={{ fontWeight: 500 }}>{r.bank_name}</div>
                          <div style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>{r.bank_account}</div>
                        </>
                      ) : '—'}
                    </td>
                    <td>
                      <span className={`badge ${r.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {r.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(r)}>Edit</button>
                        <button className={`btn btn-sm ${r.is_active ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleStatus(r)}>
                          {r.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>

      {modal && (
        <Modal title={modal === 'create' ? '+ New Receiver' : 'Edit Receiver'} onClose={closeModal}
          footer={
            <>
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? <><span className="spinner" /> Saving…</> : modal === 'create' ? 'Create' : 'Save'}
              </button>
            </>
          }
        >
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name <span className="required">*</span></label>
                <input className="form-input" value={form.full_name} onChange={f('full_name')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone <span className="required">*</span></label>
                <input className="form-input" value={form.phone} onChange={f('phone')} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-input" value={form.email} onChange={f('email')} />
              </div>
              <div className="form-group">
                <label className="form-label">Country</label>
                <input className="form-input" value={form.country} onChange={f('country')} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <input className="form-input" value={form.address} onChange={f('address')} />
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Bank Details</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Bank Name</label>
                  <input className="form-input" value={form.bank_name} onChange={f('bank_name')} placeholder="e.g. Nepal SBI Bank" />
                </div>
                <div className="form-group">
                  <label className="form-label">Account Number</label>
                  <input className="form-input mono" value={form.bank_account} onChange={f('bank_account')} placeholder="Account number" />
                </div>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

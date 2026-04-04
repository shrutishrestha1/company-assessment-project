import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { sendersAPI } from '../services/api';
import Modal from '../components/layout/Modal';
import Pagination from '../components/layout/Pagination';

const EMPTY = { full_name: '', email: '', phone: '', address: '', country: 'Japan', id_type: '', id_number: '' };

export default function SendersPage() {
  const [senders, setSenders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const fetchSenders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sendersAPI.getAll({ page, limit: 10, search });
      setSenders(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load senders.'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchSenders(); }, [fetchSenders]);

  const openCreate = () => { setForm(EMPTY); setSelected(null); setModal('create'); };
  const openEdit = (s) => {
    setForm({ full_name: s.full_name, email: s.email || '', phone: s.phone || '', address: s.address || '', country: s.country || 'Japan', id_type: s.id_type || '', id_number: s.id_number || '' });
    setSelected(s); setModal('edit');
  };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === 'create') { await sendersAPI.create(form); toast.success('Sender created.'); }
      else { await sendersAPI.update(selected.id, form); toast.success('Sender updated.'); }
      closeModal(); fetchSenders();
    } catch (err) { toast.error(err.response?.data?.message || 'Operation failed.'); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (s) => {
    try {
      await sendersAPI.toggleStatus(s.id, !s.is_active);
      toast.success(`Sender ${s.is_active ? 'deactivated' : 'activated'}.`);
      fetchSenders();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete sender "${s.full_name}"? This cannot be undone.`)) return;
    try {
      await sendersAPI.delete(s.id);
      toast.success('Sender deleted.');
      fetchSenders();
    } catch (err) { toast.error(err.response?.data?.message || 'Cannot delete sender.'); }
  };

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <div className="card" style={{ padding: 0 }}>
        <div className="filter-bar">
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input className="search-input" placeholder="Search senders…" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Add Sender</button>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="loading-overlay"><span className="spinner" /> Loading senders…</div>
          ) : senders.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📤</div><p>No senders found</p></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Phone</th><th>Country</th><th>ID Info</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {senders.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.full_name}</strong><br /><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.address || ''}</span></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{s.email || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{s.phone || '—'}</td>
                    <td>🇯🇵 {s.country}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {s.id_type ? `${s.id_type}: ${s.id_number}` : '—'}
                    </td>
                    <td>
                      <span className={`badge ${s.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}>Edit</button>
                        <button className={`btn btn-sm ${s.is_active ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleStatus(s)}>
                          {s.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s)}>Delete</button>
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
        <Modal title={modal === 'create' ? '+ New Sender' : 'Edit Sender'} onClose={closeModal}
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
                <label className="form-label">Email</label>
                <input type="email" className="form-input" value={form.email} onChange={f('email')} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone} onChange={f('phone')} />
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
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">ID Type</label>
                <select className="form-select" value={form.id_type} onChange={f('id_type')}>
                  <option value="">— Select —</option>
                  <option>Passport</option>
                  <option>Residence Card</option>
                  <option>My Number Card</option>
                  <option>Driver's License</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">ID Number</label>
                <input className="form-input" value={form.id_number} onChange={f('id_number')} />
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

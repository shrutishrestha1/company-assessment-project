import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/layout/Modal';
import Pagination from '../components/layout/Pagination';

const EMPTY_FORM = { full_name: '', email: '', phone: '', role: 'operator' };

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // null | 'create' | 'edit'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersAPI.getAll({ page, limit: 10, search });
      setUsers(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load users.'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openCreate = () => { setForm(EMPTY_FORM); setSelected(null); setModal('create'); };
  const openEdit = (u) => { setForm({ full_name: u.full_name, email: u.email, phone: u.phone || '', role: u.role }); setSelected(u); setModal('edit'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === 'create') {
        await usersAPI.create(form);
        toast.success('User created successfully.');
      } else {
        await usersAPI.update(selected.id, { full_name: form.full_name, phone: form.phone, role: form.role });
        toast.success('User updated successfully.');
      }
      closeModal();
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.message || 'Operation failed.'); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (u) => {
    try {
      await usersAPI.toggleStatus(u.id, !u.is_active);
      toast.success(`User ${u.is_active ? 'deactivated' : 'activated'}.`);
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
  };

  return (
    <div>
      <div className="card" style={{ padding: 0 }}>
        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input className="search-input" placeholder="Search by name or email…" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div style={{ flex: 1 }} />
          {me?.role === 'admin' && (
            <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Add User</button>
          )}
        </div>

        {/* Table */}
        <div className="table-container">
          {loading ? (
            <div className="loading-overlay"><span className="spinner" /> Loading users…</div>
          ) : users.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">👥</div><p>No users found</p></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th><th>Email</th><th>Phone</th><th>Role</th>
                  <th>Status</th><th>Created</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.full_name}</strong></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{u.phone || '—'}</td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-info' : 'badge-neutral'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="actions">
                        {me?.role === 'admin' && (
                          <>
                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>Edit</button>
                            {u.id !== me.id && (
                              <button
                                className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}`}
                                onClick={() => toggleStatus(u)}
                              >
                                {u.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                            )}
                          </>
                        )}
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

      {/* Modal */}
      {modal && (
        <Modal title={modal === 'create' ? 'Add New User' : 'Edit User'} onClose={closeModal}
          footer={
            <>
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? <><span className="spinner" /> Saving…</> : modal === 'create' ? 'Create User' : 'Save Changes'}
              </button>
            </>
          }
        >
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name <span className="required">*</span></label>
              <input className="form-input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            {modal === 'create' && (
              <div className="form-group">
                <label className="form-label">Email <span className="required">*</span></label>
                <input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
            )}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Role <span className="required">*</span></label>
                <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="operator">Operator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

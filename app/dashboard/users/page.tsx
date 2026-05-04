'use client';

import { useEffect, useState, useCallback } from 'react';

const ALL_MODULES = ['reports', 'blogs', 'categories', 'sectors', 'products', 'users'];

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'sub-admin';
  permissions: string[];
  isActive: boolean;
  createdAt: string;
}

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'sub-admin' as 'admin' | 'sub-admin',
  permissions: [] as string[],
  isActive: true,
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', { headers: authHeaders });
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive,
    });
    setShowModal(true);
  };

  const togglePermission = (mod: string) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(mod)
        ? f.permissions.filter((p) => p !== mod)
        : [...f.permissions, mod],
    }));
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        role: form.role,
        permissions: form.role === 'admin' ? ALL_MODULES : form.permissions,
        isActive: form.isActive,
      };
      if (form.password) payload.password = form.password;

      const url = editingUser ? `/api/users/${editingUser._id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      if (!editingUser) payload.password = form.password;

      const res = await fetch(url, { method, headers: authHeaders, body: JSON.stringify(payload) });
      const data = await res.json();

      if (data.success) {
        setSuccess(data.message);
        setShowModal(false);
        fetchUsers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${deleteTarget._id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('User deleted');
        setDeleteTarget(null);
        fetchUsers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Delete failed');
        setDeleteTarget(null);
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-0">User Management</h4>
          <p className="text-muted small mb-0">Manage admin and sub-admin accounts</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Add User
        </button>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && !showModal && !deleteTarget && (
        <div className="alert alert-danger">{error}</div>
      )}

      {/* Users Table */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-5">
              <div className="spinner-border text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center p-5 text-muted">No users found.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Permissions</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id}>
                      <td className="fw-semibold">{u.name}</td>
                      <td className="text-muted">{u.email}</td>
                      <td>
                        <span className={`badge ${u.role === 'admin' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                          {u.role === 'admin' ? 'Admin' : 'Sub-Admin'}
                        </span>
                      </td>
                      <td>
                        {u.role === 'admin' ? (
                          <span className="text-muted small">All modules</span>
                        ) : u.permissions.length === 0 ? (
                          <span className="text-muted small">None</span>
                        ) : (
                          <div className="d-flex flex-wrap gap-1">
                            {u.permissions.map((p) => (
                              <span key={p} className="badge bg-light text-dark border" style={{ fontSize: 11 }}>
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${u.isActive ? 'bg-success' : 'bg-danger'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-primary me-2"
                          onClick={() => openEdit(u)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setDeleteTarget(u)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger">{error}</div>}

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Full Name *</label>
                    <input
                      className="form-control"
                      placeholder="John Doe"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Email *</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="user@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Password {editingUser && <span className="text-muted fw-normal">(leave blank to keep current)</span>}
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder={editingUser ? 'Leave blank to keep current' : 'Min 6 characters'}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Role *</label>
                    <select
                      className="form-select"
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'sub-admin', permissions: [] })}
                    >
                      <option value="sub-admin">Sub-Admin</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {/* Permissions — only for sub-admin */}
                  {form.role === 'sub-admin' && (
                    <div className="col-12">
                      <label className="form-label fw-semibold">Module Permissions</label>
                      <div className="d-flex flex-wrap gap-3 p-3 bg-light rounded">
                        {ALL_MODULES.map((mod) => (
                          <div key={mod} className="form-check">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              id={`perm-${mod}`}
                              checked={form.permissions.includes(mod)}
                              onChange={() => togglePermission(mod)}
                            />
                            <label className="form-check-label text-capitalize" htmlFor={`perm-${mod}`}>
                              {mod}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="col-12">
                    <div className="form-check form-switch">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="isActive"
                        checked={form.isActive}
                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      />
                      <label className="form-check-label" htmlFor="isActive">
                        Account Active
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => { setShowModal(false); setError(''); }}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">Delete User</h5>
                <button className="btn-close" onClick={() => setDeleteTarget(null)} />
              </div>
              <div className="modal-body">
                Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
                This action cannot be undone.
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>
                  {saving ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

//FRONT/src/pages/Users.jsx
import { useState, useEffect } from 'react';
import { req } from '../api';
import { useToast } from '../components/Toast';

export default function Users() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'member' });

  async function load() {
    setLoading(true);
    try {
      const data = await req('GET', '/api/users');
      setUsers(Array.isArray(data.users) ? data.users : []);
    }
    catch (e) { toast('Load error: ' + e.message, 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.username.trim() || !form.email.trim() || !form.password.trim()) { toast('Username, email and password required', 'error'); return; }
    try {
      await req('POST', '/api/users', form);
      toast('User created', 'success');
      setForm({ username: '', email: '', password: '', role: 'member' });
      load();
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  }

  async function remove(id) {
    if (!confirm('Delete user?')) return;
    try {
      await req('DELETE', `/api/users/${id}`);
      toast('User deleted', 'success');
      load();
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  }

  return (
    <div>
      <div className="form-section">
        <h3>➕ Create User</h3>
        <div className="form-row">
          <div className="field">
            <label>Username *</label>
            <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder="john_doe" />
          </div>
          <div className="field">
            <label>Email *</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="john@example.com" />
          </div>
          <div className="field">
            <label>Password *</label>
            <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" />
          </div>
          <div className="field" style={{ maxWidth: 140 }}>
            <label>Role</label>
            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-success" onClick={create}>Create User</button>
        </div>
      </div>

      <div className="section-hd">
        <h2>Users</h2>
        <div className="actions">
          <button className="btn btn-ghost btn-sm" onClick={load}>{loading ? <span className="spin" /> : '↺'} Refresh</button>
        </div>
      </div>

      <div className="tbl-wrap">
        <table>
          <thead><tr><th>Username</th><th>Email</th><th>Role</th><th>ID</th><th></th></tr></thead>
          <tbody>
            {loading ? (
              <tr className="empty-row"><td colSpan={5}><span className="spin" /></td></tr>
            ) : users.length === 0 ? (
              <tr className="empty-row"><td colSpan={5}>No users found</td></tr>
            ) : users.map(u => (
              <tr key={u._id}>
                <td><b>{u.username}</b></td>
                <td>{u.email}</td>
                <td>
                  <span className="badge" style={{ background: 'rgba(79,142,247,.2)', color: 'var(--accent)' }}>
                    {u.role || 'member'}
                  </span>
                </td>
                <td style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{u._id}</td>
                <td><button className="btn btn-danger btn-sm" onClick={() => remove(u._id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
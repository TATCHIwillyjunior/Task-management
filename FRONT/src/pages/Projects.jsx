//FRONT/src/pages/Projects.jsx
import { useState, useEffect } from 'react';
import { req } from '../api';
import { useToast } from '../components/Toast';
import CopyId from '../components/CopyId';

const fmtDate = d => d ? new Date(d).toLocaleDateString() : '—';
const shortId = id => { const s = String(id || ''); return s.length > 12 ? '…' + s.slice(-8) : s; };

export default function Projects() {
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', createdBy: '' });

  async function load() {
    setLoading(true);
    try {
      const data = await req('GET', '/api/projects');
      setProjects(Array.isArray(data.projects) ? data.projects : []);
    } catch (e) {
      toast('Load error: ' + e.message, 'error');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.name.trim()) { toast('Name required', 'error'); return; }
    const body = { name: form.name, description: form.description };
    if (form.createdBy) body.createdBy = form.createdBy;
    try {
      await req('POST', '/api/projects', body);
      toast('Project created', 'success');
      setForm({ name: '', description: '', createdBy: '' });
      load();
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  }

  async function remove(id) {
    if (!confirm('Delete project?')) return;
    try {
      await req('DELETE', `/api/projects/${id}`);
      toast('Project deleted', 'success');
      load();
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  }

  return (
    <div>
      <div className="form-section">
        <h3>➕ Create Project</h3>
        <div className="form-row">
          <div className="field">
            <label>Name *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Project name" />
          </div>
          <div className="field">
            <label>Description</label>
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional" />
          </div>
          <div className="field">
            <label>Created By (User ID)</label>
            <input value={form.createdBy} onChange={e => setForm(p => ({ ...p, createdBy: e.target.value }))} placeholder="MongoDB ObjectId" />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-success" onClick={create}>Create Project</button>
        </div>
      </div>

      <div className="section-hd">
        <h2>Projects</h2>
        <div className="actions">
          <button className="btn btn-ghost btn-sm" onClick={load}>{loading ? <span className="spin" /> : '↺'} Refresh</button>
        </div>
      </div>

      <div className="tbl-wrap">
        <table>
          <thead><tr><th>Project ID</th><th>Name</th><th>Description</th><th>Created By</th><th>Created At</th><th></th></tr></thead>
          <tbody>
            {loading ? (
              <tr className="empty-row"><td colSpan={6}><span className="spin" /></td></tr>
            ) : projects.length === 0 ? (
              <tr className="empty-row"><td colSpan={6}>No projects found</td></tr>
            ) : projects.map(p => (
              <tr key={p._id}>
                <td><CopyId id={p._id} /></td>
                <td><b>{p.name}</b></td>
                <td style={{ color: 'var(--muted)' }}>{p.description || '—'}</td>
                <td><CopyId id={p.createdBy} /></td>
                <td style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtDate(p.createdAt)}</td>
                <td><button className="btn btn-danger btn-sm" onClick={() => remove(p._id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
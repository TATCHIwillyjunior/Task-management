import { useState, useEffect } from 'react';
import { req } from '../api';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';

function StatusBadge({ s }) { return <span className={`badge badge-${s}`}>{s}</span>; }
function PriBadge({ p })    { return <span className={`badge badge-${p}`}>{p}</span>; }
const fmtDate = d => d ? new Date(d).toLocaleDateString() : '—';
const shortId = id => { const s = String(id || ''); return s.length > 12 ? '…' + s.slice(-8) : s; };

export default function Tasks({ onCountChange }) {
  const toast = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: '', priority: '', projectId: '', createdBy: '' });
  const [form, setForm] = useState({ title: '', description: '', status: 'todo', priority: 'medium', dueDate: '', projectId: '', createdBy: '' });
  const [modal, setModal] = useState(null); // { task, comments }
  const [comment, setComment] = useState({ author: '', text: '' });

  async function loadTasks() {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.set(k === 'projectId' ? 'projectId' : k, v));
    try {
      const data = await req('GET', '/api/tasks?' + params);
      const list = Array.isArray(data.tasks) ? data.tasks : [];
      setTasks(list);
      onCountChange?.(list.length);
    } catch (e) {
      toast('Load error: ' + e.message, 'error');
    } finally { setLoading(false); }
  }

  useEffect(() => { loadTasks(); }, []);

  async function createTask() {
    if (!form.title.trim()) { toast('Title is required', 'error'); return; }
    const body = { ...form };
    if (!body.projectId) delete body.projectId;
    if (!body.createdBy) delete body.createdBy;
    if (!body.dueDate)   delete body.dueDate;
    try {
      await req('POST', '/api/tasks', body);
      toast('Task created', 'success');
      setForm({ title: '', description: '', status: 'todo', priority: 'medium', dueDate: '', projectId: '', createdBy: '' });
      loadTasks();
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  }

  async function openTask(id) {
    try {
      const [taskRes, commentsRes] = await Promise.all([
        req('GET', `/api/tasks/${id}`),
        req('GET', `/api/tasks/${id}/comments`),
      ]);
      setModal({ task: taskRes.task ?? taskRes, comments: commentsRes.comments ?? [] });
    } catch (e) { toast('Load error: ' + e.message, 'error'); }
  }

  async function submitComment() {
    if (!comment.text.trim()) { toast('Comment text required', 'error'); return; }
    try {
      await req('POST', `/api/tasks/${modal.task._id}/comment`, comment);
      toast('Comment posted', 'success');
      openTask(modal.task._id);
      setComment(prev => ({ ...prev, text: '' }));
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  }

  async function deleteTask(id) {
    if (!confirm('Delete this task?')) return;
    try {
      await req('DELETE', `/api/tasks/${id}`);
      toast('Task deleted', 'success');
      setModal(null);
      loadTasks();
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  }

  const fld = (key, label, extra) => (
    <div className="field" style={extra?.style}>
      <label>{label}</label>
      {extra?.type === 'select'
        ? <select value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}>{extra.opts}</select>
        : <input type={extra?.type || 'text'} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={extra?.ph} />
      }
    </div>
  );

  return (
    <div>
      {/* Create form */}
      <div className="form-section">
        <h3>➕ Create Task</h3>
        <div className="form-row">
          {fld('title',       'Title *',      { ph: 'Task title' })}
          {fld('description', 'Description',  { ph: 'Optional' })}
          {fld('status',   'Status',   { type: 'select', style: { maxWidth: 130 }, opts: ['todo','in-progress','done'].map(v => <option key={v} value={v}>{v}</option>) })}
          {fld('priority', 'Priority', { type: 'select', style: { maxWidth: 130 }, opts: ['medium','high','low'].map(v => <option key={v} value={v}>{v}</option>) })}
          {fld('dueDate',     'Due Date',     { type: 'date', style: { maxWidth: 160 } })}
          {fld('projectId',   'Project ID',   { ph: 'MongoDB ObjectId' })}
          {fld('createdBy',   'Created By',   { ph: 'MongoDB ObjectId' })}
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-success" onClick={createTask}>Create Task</button>
        </div>
      </div>

      {/* Filters */}
      <div className="form-section" style={{ padding: '14px 20px' }}>
        <div className="form-row" style={{ alignItems: 'center' }}>
          <div className="field" style={{ maxWidth: 140 }}>
            <label>Status</label>
            <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
              <option value="">All</option>
              {['todo','in-progress','done'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="field" style={{ maxWidth: 140 }}>
            <label>Priority</label>
            <select value={filters.priority} onChange={e => setFilters(p => ({ ...p, priority: e.target.value }))}>
              <option value="">All</option>
              {['high','medium','low'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Project ID</label>
            <input value={filters.projectId} onChange={e => setFilters(p => ({ ...p, projectId: e.target.value }))} placeholder="filter by project" />
          </div>
          <div className="field">
            <label>Created By</label>
            <input value={filters.createdBy} onChange={e => setFilters(p => ({ ...p, createdBy: e.target.value }))} placeholder="filter by user" />
          </div>
          <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={loadTasks}>Search</button>
        </div>
      </div>

      <div className="section-hd">
        <h2>Tasks <span className="nav-badge">{tasks.length}</span></h2>
        <div className="actions">
          <button className="btn btn-ghost btn-sm" onClick={loadTasks}>{loading ? <span className="spin" /> : '↺'} Refresh</button>
        </div>
      </div>

      <div className="tbl-wrap">
        <table>
          <thead><tr><th>Task ID</th><th>Title</th><th>Status</th><th>Priority</th><th>Due</th><th>Project ID</th><th></th></tr></thead>
          <tbody>
            {loading ? (
              <tr className="empty-row"><td colSpan={7}><span className="spin" /></td></tr>
            ) : tasks.length === 0 ? (
              <tr className="empty-row"><td colSpan={7}>No tasks found</td></tr>
            ) : tasks.map(t => (
              <tr key={t._id}>
                <td style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{t._id}</td>
                <td><b>{t.title}</b></td>
                <td><StatusBadge s={t.status} /></td>
                <td><PriBadge p={t.priority} /></td>
                <td>{fmtDate(t.dueDate)}</td>
                <td style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{t.projectId ? String(t.projectId) : '—'}</td>
                <td><button className="btn btn-ghost btn-sm" onClick={() => openTask(t._id)}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Task detail modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.task?.title || 'Task Detail'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Close</button>
            <button className="btn btn-danger" onClick={() => deleteTask(modal.task._id)}>Delete</button>
          </>
        }
      >
        {modal && (
          <>
            <div className="grid2" style={{ marginBottom: 12 }}>
              <div>
                <StatusBadge s={modal.task.status} />{' '}
                <PriBadge p={modal.task.priority} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Due: {fmtDate(modal.task.dueDate)}</div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>{modal.task.description || 'No description'}</p>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>ID: {modal.task._id}</div>

            <hr className="divider" />
            <h3 style={{ fontSize: 14, marginBottom: 12 }}>Comments</h3>
            <div style={{ marginBottom: 12 }}>
              {modal.comments.length === 0
                ? <span style={{ color: 'var(--muted)', fontSize: 13 }}>No comments yet</span>
                : modal.comments.map((c, i) => (
                  <div key={i} style={{ borderBottom: '1px solid var(--border)', padding: '8px 0', fontSize: 13 }}>
                    <span style={{ color: 'var(--accent)' }}>{shortId(c.author)}</span>: {c.text}
                    <span style={{ float: 'right', fontSize: 11, color: 'var(--muted)' }}>{fmtDate(c.createdAt)}</span>
                  </div>
                ))
              }
            </div>
            <div className="form-row">
              <div className="field">
                <label>Author ID</label>
                <input value={comment.author} onChange={e => setComment(p => ({ ...p, author: e.target.value }))} placeholder="user ObjectId" />
              </div>
              <div className="field" style={{ flex: 2 }}>
                <label>Comment</label>
                <input value={comment.text} onChange={e => setComment(p => ({ ...p, text: e.target.value }))} placeholder="Write a comment…" onKeyDown={e => e.key === 'Enter' && submitComment()} />
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 18 }} onClick={submitComment}>Post</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
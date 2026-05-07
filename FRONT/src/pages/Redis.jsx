import { useState, useEffect } from 'react';
import { req } from '../api';
import { useToast } from '../components/Toast';

const ACTIVITY_ICONS = { task_created: '✅', task_updated: '✏️', task_deleted: '🗑️', comment: '💬', login: '🔐' };

export default function Redis() {
  const toast = useToast();

  // Stats
  const [stats, setStats] = useState({ health: '—', keys: '—', keyList: [] });

  // Task cache
  const [tc, setTc] = useState({ id: '', ttl: '300', payload: '' });
  const [tcOut, setTcOut] = useState(null);

  // Session
  const [sess, setSess] = useState({ id: '', ttl: '86400', payload: '' });
  const [sessOut, setSessOut] = useState(null);

  // Leaderboard
  const [lb, setLb] = useState({ top: 5, items: [] });
  const [lbAdd, setLbAdd] = useState({ uid: '', score: '1', open: false });

  // Urgent queue
  const [uq, setUq] = useState({ limit: 10, items: [] });
  const [uqAdd, setUqAdd] = useState({ id: '', score: '100', open: false });

  // Activity
  const [af, setAf] = useState({ uid: '', limit: '10', items: [] });
  const [afLog, setAfLog] = useState({ type: '', data: '' });

  // Tags
  const [tag, setTag] = useState({ name: '', taskId: '', items: [] });

  async function loadStats() {
    try {
      const [h, s] = await Promise.all([req('GET', '/api/redis/health'), req('GET', '/api/redis/stats')]);
      setStats({ health: h.status || 'ok', keys: s.totalKeys ?? '—', keyList: s.keys || [] });
    } catch (e) { toast('Redis stats error: ' + e.message, 'error'); }
  }

  async function flush() {
    if (!confirm('Flush ALL Redis keys?')) return;
    try { await req('POST', '/api/redis/flush'); toast('Redis flushed', 'success'); loadStats(); }
    catch (e) { toast('Error: ' + e.message, 'error'); }
  }

  useEffect(() => { loadStats(); loadLeaderboard(); loadUrgent(); }, []);

  /* ── Task cache ── */
  async function cacheTask() {
    if (!tc.id) { toast('Task ID required', 'error'); return; }
    let payload;
    try { payload = JSON.parse(tc.payload || '{}'); } catch { toast('Invalid JSON payload', 'error'); return; }
    try { setTcOut(await req('POST', `/api/redis/task/${tc.id}`, { payload, ttl: +tc.ttl })); toast('Cached', 'success'); }
    catch (e) { toast('Error: ' + e.message, 'error'); }
  }
  async function getTask() {
    if (!tc.id) { toast('Task ID required', 'error'); return; }
    try { setTcOut(await req('GET', `/api/redis/task/${tc.id}`)); }
    catch (e) { toast('Error: ' + e.message, 'error'); }
  }
  async function delTask() {
    if (!tc.id) { toast('Task ID required', 'error'); return; }
    try { setTcOut(await req('DELETE', `/api/redis/task/${tc.id}`)); toast('Invalidated', 'success'); }
    catch (e) { toast('Error: ' + e.message, 'error'); }
  }

  /* ── Session ── */
  async function storeSession() {
    if (!sess.id) { toast('Session ID required', 'error'); return; }
    let payload;
    try { payload = JSON.parse(sess.payload || '{}'); } catch { toast('Invalid JSON', 'error'); return; }
    try { setSessOut(await req('POST', `/api/redis/session/${sess.id}`, { payload, ttl: +sess.ttl })); toast('Stored', 'success'); }
    catch (e) { toast('Error: ' + e.message, 'error'); }
  }
  async function getSession() {
    if (!sess.id) { toast('Session ID required', 'error'); return; }
    try { setSessOut(await req('GET', `/api/redis/session/${sess.id}`)); }
    catch (e) { toast('Error: ' + e.message, 'error'); }
  }
  async function delSession() {
    if (!sess.id) { toast('Session ID required', 'error'); return; }
    try { setSessOut(await req('DELETE', `/api/redis/session/${sess.id}`)); toast('Invalidated', 'success'); }
    catch (e) { toast('Error: ' + e.message, 'error'); }
  }

  /* ── Leaderboard ── */
  async function loadLeaderboard() {
    try {
      const d = await req('GET', `/api/redis/leaderboard?top=${lb.top}`);
      const items = Array.isArray(d) ? d : (d.leaderboard || []);
      setLb(p => ({ ...p, items }));
    } catch (e) { toast('Leaderboard error: ' + e.message, 'error'); }
  }
  async function updateLb() {
    if (!lbAdd.uid) { toast('User ID required', 'error'); return; }
    try {
      await req('POST', `/api/redis/leaderboard/${lbAdd.uid}`, { tasksCompleted: +lbAdd.score });
      toast('Score updated', 'success');
      loadLeaderboard();
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  }

  /* ── Urgent queue ── */
  async function loadUrgent() {
    try {
      const d = await req('GET', `/api/redis/urgent?limit=${uq.limit}`);
      const items = Array.isArray(d) ? d : [];
      setUq(p => ({ ...p, items }));
    } catch (e) { toast('Urgent error: ' + e.message, 'error'); }
  }
  async function enqueue() {
    if (!uqAdd.id) { toast('Task ID required', 'error'); return; }
    try {
      await req('POST', `/api/redis/urgent/${uqAdd.id}`, { score: +uqAdd.score, ttl: 300 });
      toast('Enqueued', 'success');
      loadUrgent();
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  }

  /* ── Activity ── */
  async function loadActivity() {
    if (!af.uid) { toast('User ID required', 'error'); return; }
    try {
      const d = await req('GET', `/api/redis/activity/${af.uid}?limit=${af.limit}`);
      const items = Array.isArray(d) ? d : (d.activity || d.feed || []);
      setAf(p => ({ ...p, items }));
    } catch (e) { toast('Activity error: ' + e.message, 'error'); }
  }
  async function logActivity() {
    if (!af.uid || !afLog.type) { toast('User ID and type required', 'error'); return; }
    let data;
    try { data = JSON.parse(afLog.data || '{}'); } catch { toast('Invalid JSON data', 'error'); return; }
    try {
      await req('POST', `/api/redis/activity/${af.uid}`, { type: afLog.type, data });
      toast('Activity logged', 'success');
      loadActivity();
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  }

  /* ── Tags ── */
  async function loadTag() {
    if (!tag.name) { toast('Tag name required', 'error'); return; }
    try {
      const d = await req('GET', `/api/redis/tag/${tag.name}`);
      const items = Array.isArray(d.tasks) ? d.tasks : Array.isArray(d) ? d : [];
      setTag(p => ({ ...p, items }));
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  }
  async function addTag() {
    if (!tag.name || !tag.taskId) { toast('Tag name and task ID required', 'error'); return; }
    try {
      await req('POST', `/api/redis/tag/${tag.name}`, { taskId: tag.taskId });
      toast('Added to tag', 'success');
      loadTag();
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  }

  const maxScore = Math.max(...lb.items.map(i => i.score ?? i.tasksCompleted ?? 0), 1);

  return (
    <div>
      <p style={{ color: 'var(--redis)', fontSize: 13, marginBottom: 20 }}>
        ⚡ Redis — cache, sessions, leaderboard, activity feed, urgent queue, tags
      </p>

      {/* Cache overview */}
      <div className="section-hd">
        <h2>Cache Overview</h2>
        <div className="actions">
          <button className="btn btn-ghost btn-sm" onClick={loadStats}>↺ Stats</button>
          <button className="btn btn-danger btn-sm" onClick={flush}>🗑 Flush All</button>
        </div>
      </div>

      <div className="grid3" style={{ marginBottom: 20 }}>
        <div className="card redis-bg">
          <h3><span className="dot" style={{ background: 'var(--redis)' }} />Redis Health</h3>
          <div className="big">{stats.health}</div>
        </div>
        <div className="card redis-bg">
          <h3><span className="dot" style={{ background: 'var(--redis)' }} />Total Keys</h3>
          <div className="big">{stats.keys}</div>
        </div>
        <div className="card redis-bg">
          <h3><span className="dot" style={{ background: 'var(--redis)' }} />Key List</h3>
          <div style={{ fontSize: 12, color: 'var(--muted)', maxHeight: 80, overflowY: 'auto' }}>
            {stats.keyList.length === 0
              ? <span>empty</span>
              : stats.keyList.map(k => <span key={k} className="tag-pill">{k}</span>)
            }
          </div>
        </div>
      </div>

      {/* Task cache + Session */}
      <div className="grid2" style={{ marginBottom: 20 }}>
        <div className="form-section redis-bg" style={{ margin: 0 }}>
          <h3>📦 Task Cache</h3>
          <div className="field" style={{ marginBottom: 8 }}>
            <label>Task ID</label>
            <input value={tc.id} onChange={e => setTc(p => ({ ...p, id: e.target.value }))} placeholder="e.g. abc123" />
          </div>
          <div className="form-row" style={{ marginBottom: 8 }}>
            <div className="field">
              <label>TTL (s)</label>
              <input type="number" value={tc.ttl} onChange={e => setTc(p => ({ ...p, ttl: e.target.value }))} />
            </div>
            <div className="field">
              <label>Payload (JSON)</label>
              <textarea rows={2} value={tc.payload} onChange={e => setTc(p => ({ ...p, payload: e.target.value }))} placeholder='{"title":"My Task"}' />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-danger btn-sm" onClick={cacheTask}>Cache</button>
            <button className="btn btn-ghost btn-sm" onClick={getTask}>Get</button>
            <button className="btn btn-ghost btn-sm" onClick={delTask}>Invalidate</button>
          </div>
          {tcOut && <pre>{JSON.stringify(tcOut, null, 2)}</pre>}
        </div>

        <div className="form-section redis-bg" style={{ margin: 0 }}>
          <h3>🔐 Session Storage</h3>
          <div className="field" style={{ marginBottom: 8 }}>
            <label>Session ID</label>
            <input value={sess.id} onChange={e => setSess(p => ({ ...p, id: e.target.value }))} placeholder="session id" />
          </div>
          <div className="form-row" style={{ marginBottom: 8 }}>
            <div className="field">
              <label>TTL (s)</label>
              <input type="number" value={sess.ttl} onChange={e => setSess(p => ({ ...p, ttl: e.target.value }))} />
            </div>
            <div className="field">
              <label>Payload (JSON)</label>
              <textarea rows={2} value={sess.payload} onChange={e => setSess(p => ({ ...p, payload: e.target.value }))} placeholder='{"userId":"u1"}' />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-danger btn-sm" onClick={storeSession}>Store</button>
            <button className="btn btn-ghost btn-sm" onClick={getSession}>Get</button>
            <button className="btn btn-ghost btn-sm" onClick={delSession}>Invalidate</button>
          </div>
          {sessOut && <pre>{JSON.stringify(sessOut, null, 2)}</pre>}
        </div>
      </div>

      {/* Leaderboard + Urgent */}
      <div className="grid2" style={{ marginBottom: 20 }}>
        <div className="card redis-bg">
          <h3><span className="dot" style={{ background: 'var(--redis)' }} />🏆 Leaderboard</h3>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div className="field" style={{ maxWidth: 80 }}>
              <label>Top N</label>
              <input type="number" value={lb.top} onChange={e => setLb(p => ({ ...p, top: e.target.value }))} />
            </div>
            <button className="btn btn-danger btn-sm" style={{ marginTop: 18 }} onClick={loadLeaderboard}>Load</button>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 18 }} onClick={() => setLbAdd(p => ({ ...p, open: !p.open }))}>
              {lbAdd.open ? '✕ Cancel' : '+ Score'}
            </button>
          </div>
          {lbAdd.open && (
            <div className="form-row" style={{ marginBottom: 10 }}>
              <div className="field"><label>User ID</label><input value={lbAdd.uid} onChange={e => setLbAdd(p => ({ ...p, uid: e.target.value }))} placeholder="userId" /></div>
              <div className="field" style={{ maxWidth: 100 }}><label>Tasks Done</label><input type="number" value={lbAdd.score} onChange={e => setLbAdd(p => ({ ...p, score: e.target.value }))} /></div>
              <button className="btn btn-danger btn-sm" style={{ marginTop: 18 }} onClick={updateLb}>Submit</button>
            </div>
          )}
          {lb.items.length === 0
            ? <span style={{ color: 'var(--muted)', fontSize: 13 }}>Empty leaderboard</span>
            : lb.items.map((item, i) => {
                const score = item.score ?? item.tasksCompleted ?? 0;
                const pct = Math.round((score / maxScore) * 100);
                const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'other';
                return (
                  <div key={i} className="lb-row">
                    <div className={`lb-rank ${rankClass}`}>{i + 1}</div>
                    <div className="lb-name">{item.userId || item.member || '—'}</div>
                    <div className="lb-bar-wrap"><div className="lb-bar" style={{ width: `${pct}%` }} /></div>
                    <div className="lb-score">{score}</div>
                  </div>
                );
              })
          }
        </div>

        <div className="card redis-bg">
          <h3><span className="dot" style={{ background: 'var(--redis)' }} />🚨 Urgent Queue</h3>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div className="field" style={{ maxWidth: 80 }}>
              <label>Limit</label>
              <input type="number" value={uq.limit} onChange={e => setUq(p => ({ ...p, limit: e.target.value }))} />
            </div>
            <button className="btn btn-danger btn-sm" style={{ marginTop: 18 }} onClick={loadUrgent}>Load</button>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 18 }} onClick={() => setUqAdd(p => ({ ...p, open: !p.open }))}>
              {uqAdd.open ? '✕ Cancel' : '+ Enqueue'}
            </button>
          </div>
          {uqAdd.open && (
            <div className="form-row" style={{ marginBottom: 10 }}>
              <div className="field"><label>Task ID</label><input value={uqAdd.id} onChange={e => setUqAdd(p => ({ ...p, id: e.target.value }))} placeholder="taskId" /></div>
              <div className="field" style={{ maxWidth: 80 }}><label>Score</label><input type="number" value={uqAdd.score} onChange={e => setUqAdd(p => ({ ...p, score: e.target.value }))} /></div>
              <button className="btn btn-danger btn-sm" style={{ marginTop: 18 }} onClick={enqueue}>Add</button>
            </div>
          )}
          {uq.items.length === 0
            ? <span style={{ color: 'var(--muted)', fontSize: 13 }}>Queue is empty</span>
            : uq.items.map((item, i) => {
                const id = item.taskId || item.value || item.member || JSON.stringify(item);
                const score = item.urgencyScore ?? item.score ?? '—';
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span>{id}</span>
                    <span style={{ color: 'var(--redis)', fontWeight: 600 }}>{score}</span>
                  </div>
                );
              })
          }
        </div>
      </div>

      {/* Activity + Tags */}
      <div className="grid2">
        <div className="card redis-bg">
          <h3><span className="dot" style={{ background: 'var(--redis)' }} />📜 Activity Feed</h3>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div className="field"><label>User ID</label><input value={af.uid} onChange={e => setAf(p => ({ ...p, uid: e.target.value }))} placeholder="userId" /></div>
            <div className="field" style={{ maxWidth: 80 }}><label>Limit</label><input type="number" value={af.limit} onChange={e => setAf(p => ({ ...p, limit: e.target.value }))} /></div>
            <button className="btn btn-danger btn-sm" style={{ marginTop: 18 }} onClick={loadActivity}>Load</button>
          </div>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div className="field"><label>Log Type</label><input value={afLog.type} onChange={e => setAfLog(p => ({ ...p, type: e.target.value }))} placeholder="e.g. task_created" /></div>
            <div className="field"><label>Data (JSON)</label><input value={afLog.data} onChange={e => setAfLog(p => ({ ...p, data: e.target.value }))} placeholder='{"taskId":"x"}' /></div>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 18 }} onClick={logActivity}>Log</button>
          </div>
          {af.items.length === 0
            ? <span style={{ color: 'var(--muted)', fontSize: 13 }}>No activity</span>
            : af.items.map((item, i) => {
                let parsed = item;
                if (typeof item === 'string') { try { parsed = JSON.parse(item); } catch {} }
                const type = parsed.type || 'event';
                return (
                  <div key={i} className="activity-item">
                    <div className="activity-icon">{ACTIVITY_ICONS[type] || '📌'}</div>
                    <div>
                      <div className="activity-type">{type}</div>
                      <div className="activity-data">
                        {typeof parsed.data === 'object' ? JSON.stringify(parsed.data) : (parsed.data || JSON.stringify(parsed))}
                      </div>
                    </div>
                  </div>
                );
              })
          }
        </div>

        <div className="card redis-bg">
          <h3><span className="dot" style={{ background: 'var(--redis)' }} />🏷️ Tags</h3>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div className="field"><label>Tag Name</label><input value={tag.name} onChange={e => setTag(p => ({ ...p, name: e.target.value }))} placeholder="e.g. bug" /></div>
            <button className="btn btn-danger btn-sm" style={{ marginTop: 18 }} onClick={loadTag}>Get Tasks</button>
          </div>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div className="field"><label>Task ID to add</label><input value={tag.taskId} onChange={e => setTag(p => ({ ...p, taskId: e.target.value }))} placeholder="taskId" /></div>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 18 }} onClick={addTag}>Add to Tag</button>
          </div>
          {tag.items.length === 0
            ? <span style={{ color: 'var(--muted)', fontSize: 13 }}>No tasks for this tag</span>
            : tag.items.map((t, i) => <span key={i} className="tag-pill">{String(t)}</span>)
          }
        </div>
      </div>
    </div>
  );
}
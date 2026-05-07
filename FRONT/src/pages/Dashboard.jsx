import { useState, useEffect } from 'react';
import { req } from '../api';
import { useToast } from '../components/Toast';

function StatusBadge({ s }) {
  return <span className={`badge badge-${s}`}>{s}</span>;
}
function PriBadge({ p }) {
  return <span className={`badge badge-${p}`}>{p}</span>;
}

export default function Dashboard() {
  const toast = useToast();
  const [health, setHealth] = useState({ mongodb: '—', neo4j: '—', redis: '—' });
  const [healthColors, setHealthColors] = useState({});
  const [kpi, setKpi] = useState({ total: '—', prog: '—', done: '—', over: '—' });
  const [metrics, setMetrics] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadHealth(), loadAnalytics(), loadOverdue()]);
    setLoading(false);
  }

  async function loadHealth() {
    try {
      const d = await req('GET', '/health');
      const db = d.databases || {};
      setHealth({ mongodb: db.mongodb || '—', neo4j: db.neo4j || '—', redis: db.redis || '—' });
      const colors = {};
      ['mongodb', 'neo4j', 'redis'].forEach(k => {
        colors[k] = db[k] === 'healthy'
          ? { background: 'rgba(77,184,122,.08)', borderColor: 'rgba(77,184,122,.4)' }
          : { background: 'rgba(224,82,82,.08)', borderColor: 'rgba(224,82,82,.4)' };
      });
      setHealthColors(colors);
    } catch (e) {
      toast('Cannot reach API: ' + e.message, 'error');
    }
  }

  async function loadAnalytics() {
    try {
      const d = await req('GET', '/api/tasks/analytics/dashboard');
      // route returns { type, data: { period, timestamp, metrics: [...] } }
      const list = Array.isArray(d?.data?.metrics) ? d.data.metrics : [];
      setMetrics(list);
      let total = 0, prog = 0, done = 0;
      list.forEach(m => {
        total += m.taskCount || 0;
        if (m.status === 'in-progress') prog = m.taskCount;
        if (m.status === 'done') done = m.taskCount;
      });
      setKpi(prev => ({ ...prev, total, prog, done }));
    } catch (e) {
      toast('Analytics error: ' + e.message, 'error');
    }
  }

  async function loadOverdue() {
    try {
      const d = await req('GET', '/api/tasks/analytics/overdue');
      // route returns { type, data: { alert, timestamp, data: [...] } }
      const groups = Array.isArray(d?.data?.data) ? d.data.data : [];
      setOverdue(groups);
      const total = groups.reduce((s, g) => s + (g.overduCount || 0), 0);
      setKpi(prev => ({ ...prev, over: total }));
    } catch (e) {
      toast('Overdue error: ' + e.message, 'error');
    }
  }

  useEffect(() => { loadAll(); }, []);

  return (
    <div>
      <div className="section-hd">
        <h2>Dashboard</h2>
        <div className="actions">
          <button className="btn btn-ghost btn-sm" onClick={loadAll}>
            {loading ? <span className="spin" /> : '↺'} Refresh
          </button>
        </div>
      </div>

      {/* Health */}
      <div className="health-grid">
        {[
          { key: 'mongodb', label: 'MongoDB',  ico: '🍃' },
          { key: 'neo4j',   label: 'Neo4j',    ico: '🕸️' },
          { key: 'redis',   label: 'Redis',     ico: '⚡' },
        ].map(({ key, label, ico }) => (
          <div key={key} className="health-card" style={healthColors[key] || {}}>
            <span className="ico" style={{ fontSize: 24 }}>{ico}</span>
            <div>
              <div className="label">{label}</div>
              <div className="val">{health[key]}</div>
            </div>
          </div>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid4" style={{ marginBottom: 20 }}>
        <div className="card">
          <h3><span className="dot" style={{ background: 'var(--mongo)' }} />Total Tasks</h3>
          <div className="big">{kpi.total}</div>
          <div className="sub">last 30 days</div>
        </div>
        <div className="card">
          <h3><span className="dot" style={{ background: 'var(--accent)' }} />In Progress</h3>
          <div className="big accent">{kpi.prog}</div>
          <div className="sub">active tasks</div>
        </div>
        <div className="card">
          <h3><span className="dot" style={{ background: 'var(--mongo)' }} />Done</h3>
          <div className="big mongo">{kpi.done}</div>
          <div className="sub">completed</div>
        </div>
        <div className="card">
          <h3><span className="dot" style={{ background: 'var(--redis)' }} />Overdue</h3>
          <div className="big redis">{kpi.over}</div>
          <div className="sub">needs attention</div>
        </div>
      </div>

      <div className="grid2">
        {/* Analytics */}
        <div className="card">
          <h3><span className="dot" style={{ background: 'var(--mongo)' }} />Task Metrics (30d)</h3>
          {metrics.length === 0 ? (
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>No data</span>
          ) : (
            <div className="tbl-wrap" style={{ margin: 0 }}>
              <table>
                <thead><tr><th>Status</th><th>Count</th><th>Avg Days</th><th>Avg Priority</th></tr></thead>
                <tbody>
                  {metrics.map(m => (
                    <tr key={m.status}>
                      <td><StatusBadge s={m.status} /></td>
                      <td>{m.taskCount}</td>
                      <td>{m.avgCompletionDays ?? '—'}</td>
                      <td>{m.avgPriorityScore ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Overdue */}
        <div className="card redis-bg">
          <h3><span className="dot" style={{ background: 'var(--redis)' }} />Overdue Alerts</h3>
          {overdue.length === 0 ? (
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>No overdue tasks</span>
          ) : overdue.map(g => (
            <div key={g.priority} style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                <PriBadge p={g.priority} /> — {g.overduCount} overdue
              </div>
              {(g.tasks || []).slice(0, 4).map(t => (
                <div key={t._id} style={{ fontSize: 12, color: 'var(--muted)', padding: '2px 0' }}>
                  • {t.title}{' '}
                  <span style={{ color: 'var(--redis)' }}>({Math.round(t.daysOverdue)}d overdue)</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
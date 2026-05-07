import { useState } from 'react';
import { ToastContainer } from './components/Toast';
import Dashboard from './pages/Dashboard';
import Tasks     from './pages/Tasks';
import Projects  from './pages/Projects';
import Users     from './pages/Users';
import Neo4j     from './pages/Neo4j';
import Redis     from './pages/Redis';

const TABS = [
  { id: 'dashboard', label: '🏠 Dashboard' },
  { id: 'tasks',     label: '📋 Tasks' },
  { id: 'projects',  label: '📁 Projects' },
  { id: 'users',     label: '👤 Users' },
  { id: 'neo4j',     label: '🔗 Neo4j',   style: { color: 'var(--neo4j)' } },
  { id: 'redis',     label: '⚡ Redis',    style: { color: 'var(--redis)' } },
];

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [taskCount, setTaskCount] = useState(null);

  return (
    <>
      <header>
        <h1>⚡ Task Management System</h1>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          NoSQL · MongoDB · Neo4j · Redis
        </span>
      </header>

      <nav>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`nav-btn ${tab === t.id ? 'active' : ''}`}
            style={tab !== t.id ? t.style : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'tasks' && taskCount !== null && (
              <span className="nav-badge">{taskCount}</span>
            )}
          </button>
        ))}
      </nav>

      <main>
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'tasks'     && <Tasks onCountChange={setTaskCount} />}
        {tab === 'projects'  && <Projects />}
        {tab === 'users'     && <Users />}
        {tab === 'neo4j'     && <Neo4j />}
        {tab === 'redis'     && <Redis />}
      </main>

      <ToastContainer />
    </>
  );
}
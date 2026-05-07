import { useState } from 'react';

import { req } from '../api';

import { useToast } from '../components/Toast';

 

function ResultBox({ data }) {

  if (!data) return null;

  return <pre>{JSON.stringify(data, null, 2)}</pre>;

}

 

function ActionCard({ title, children, className = '' }) {

  return (

    <div className={`form-section neo4j-bg ${className}`} style={{ margin: 0 }}>

      <h3>{title}</h3>

      {children}

    </div>

  );

}

 

export default function Neo4j() {

  const toast = useToast();

 

  // write forms

  const [assign, setAssign] = useState({ taskId: '', userId: '' });

  const [block,  setBlock]  = useState({ taskId: '', blockedById: '' });

  const [skill,  setSkill]  = useState({ userId: '', skill: '' });

  const [member, setMember] = useState({ projectId: '', userId: '' });

 

  // read forms + results

  const [utUser, setUtUser] = useState(''); const [utResult, setUtResult] = useState(null);

  const [chainTask, setChainTask] = useState(''); const [chainResult, setChainResult] = useState(null);

  const [teamProj, setTeamProj] = useState(''); const [teamResult, setTeamResult] = useState(null);

  const [recSkill, setRecSkill] = useState(''); const [recResult, setRecResult] = useState(null);

 

  async function run(fn) {

    try { await fn(); }

    catch (e) { toast('Error: ' + e.message, 'error'); }

  }

 

  return (

    <div>

      <p style={{ color: 'var(--neo4j)', fontSize: 13, marginBottom: 20 }}>

        🕸️ Neo4j Graph — task assignments, blockers, team membership &amp; skill matching

      </p>

 

      {/* Write operations */}

      <div className="grid2" style={{ marginBottom: 20 }}>

        <ActionCard title="📌 Assign Task to User">

          <div className="field" style={{ marginBottom: 8 }}>

            <label>Task ID</label>

            <input value={assign.taskId} onChange={e => setAssign(p => ({ ...p, taskId: e.target.value }))} placeholder="task id" />

          </div>

          <div className="field" style={{ marginBottom: 12 }}>

            <label>User ID</label>

            <input value={assign.userId} onChange={e => setAssign(p => ({ ...p, userId: e.target.value }))} placeholder="user id" />

          </div>

          <button className="btn btn-neo" onClick={() => run(async () => {

            await req('POST', '/api/relationships/assign', assign);

            toast('Task assigned', 'success');

          })}>Assign</button>

        </ActionCard>

 

        <ActionCard title="🚫 Block Task">

          <div className="field" style={{ marginBottom: 8 }}>

            <label>Blocked Task ID</label>

            <input value={block.taskId} onChange={e => setBlock(p => ({ ...p, taskId: e.target.value }))} placeholder="task to block" />

          </div>

          <div className="field" style={{ marginBottom: 12 }}>

            <label>Blocker Task ID</label>

            <input value={block.blockedById} onChange={e => setBlock(p => ({ ...p, blockedById: e.target.value }))} placeholder="blocking task" />

          </div>

          <button className="btn btn-neo" onClick={() => run(async () => {

            await req('POST', '/api/relationships/block', block);

            toast('Blocker set', 'success');

          })}>Set Blocker</button>

        </ActionCard>

 

        <ActionCard title="🎓 Add Skill to User">

          <div className="field" style={{ marginBottom: 8 }}>

            <label>User ID</label>

            <input value={skill.userId} onChange={e => setSkill(p => ({ ...p, userId: e.target.value }))} placeholder="user id" />

          </div>

          <div className="field" style={{ marginBottom: 12 }}>

            <label>Skill</label>

            <input value={skill.skill} onChange={e => setSkill(p => ({ ...p, skill: e.target.value }))} placeholder="e.g. JavaScript" />

          </div>

          <button className="btn btn-neo" onClick={() => run(async () => {

            await req('POST', '/api/relationships/skill', skill);

            toast('Skill added', 'success');

          })}>Add Skill</button>

        </ActionCard>

 

        <ActionCard title="👥 Add User to Project">

          <div className="field" style={{ marginBottom: 8 }}>

            <label>Project ID</label>

            <input value={member.projectId} onChange={e => setMember(p => ({ ...p, projectId: e.target.value }))} placeholder="project id" />

          </div>

          <div className="field" style={{ marginBottom: 12 }}>

            <label>User ID</label>

            <input value={member.userId} onChange={e => setMember(p => ({ ...p, userId: e.target.value }))} placeholder="user id" />

          </div>

          <button className="btn btn-neo" onClick={() => run(async () => {

            await req('POST', '/api/relationships/project/member', member);

            toast('Member added', 'success');

          })}>Add Member</button>

        </ActionCard>

      </div>

 

      <hr className="divider" />

 

      {/* Read operations */}

      <div className="grid2">

        <div className="card neo4j-bg">

          <h3>Tasks assigned to user</h3>

          <div className="form-row" style={{ marginBottom: 10 }}>

            <div className="field">

              <input value={utUser} onChange={e => setUtUser(e.target.value)} placeholder="user id" />

            </div>

            <button className="btn btn-neo btn-sm" onClick={() => run(async () => {

              setUtResult(await req('GET', `/api/relationships/user/${utUser}/tasks`));

            })}>Load</button>

          </div>

          <ResultBox data={utResult} />

        </div>

 

        <div className="card neo4j-bg">

          <h3>Blocking chain for task</h3>

          <div className="form-row" style={{ marginBottom: 10 }}>

            <div className="field">

              <input value={chainTask} onChange={e => setChainTask(e.target.value)} placeholder="task id" />

            </div>

            <button className="btn btn-neo btn-sm" onClick={() => run(async () => {

              setChainResult(await req('GET', `/api/relationships/task/${chainTask}/blocking`));

            })}>Load</button>

          </div>

          <ResultBox data={chainResult} />

        </div>

 

        <div className="card neo4j-bg">

          <h3>Project team members</h3>

          <div className="form-row" style={{ marginBottom: 10 }}>

            <div className="field">

              <input value={teamProj} onChange={e => setTeamProj(e.target.value)} placeholder="project id" />

            </div>

            <button className="btn btn-neo btn-sm" onClick={() => run(async () => {

              setTeamResult(await req('GET', `/api/relationships/project/${teamProj}/team`));

            })}>Load</button>

          </div>

          <ResultBox data={teamResult} />

        </div>

 

        <div className="card neo4j-bg">

          <h3>Recommend user by skill</h3>

          <div className="form-row" style={{ marginBottom: 10 }}>

            <div className="field">

              <input value={recSkill} onChange={e => setRecSkill(e.target.value)} placeholder="e.g. JavaScript" />

            </div>

            <button className="btn btn-neo btn-sm" onClick={() => run(async () => {

              setRecResult(await req('GET', `/api/relationships/recommend?skill=${encodeURIComponent(recSkill)}`));

            })}>Find</button>

          </div>

          <ResultBox data={recResult} />

        </div>

      </div>

    </div>

  );

}
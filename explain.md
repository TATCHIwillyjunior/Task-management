# How the Task Management System Works

This document explains the project end-to-end: what each piece does, why it exists, and how a request travels from the browser all the way through three different databases and back.

---

## 1. Big Picture

```
┌──────────────────────────────────────────────────────────┐
│                    Browser (React app)                   │
│                   localhost:5173                         │
└────────────────────────┬─────────────────────────────────┘
                         │  HTTP (Vite proxy)
                         ▼
┌──────────────────────────────────────────────────────────┐
│               Express.js REST API                        │
│               localhost:5000  (Docker)                   │
└───────────┬─────────────────┬──────────────┬────────────┘
            │                 │              │
            ▼                 ▼              ▼
     ┌────────────┐  ┌──────────────┐  ┌──────────┐
     │  MongoDB   │  │    Neo4j     │  │  Redis   │
     │  port 27017│  │  port 7687   │  │ port 6379│
     └────────────┘  └──────────────┘  └──────────┘
```

The system uses **three databases in parallel**, each chosen for what it does best:

| Database | Strength | Used for |
|----------|----------|----------|
| MongoDB | Flexible document storage | Tasks, projects, users — the primary data |
| Neo4j | Graph traversal | Relationships between entities (who owns what, what blocks what) |
| Redis | In-memory speed | Caching, sessions, leaderboard, activity feed, urgent queue, tags |

They are not redundant — they complement each other. A task lives in MongoDB (full document), but who is assigned to it lives in Neo4j (graph edge), and the cached copy of it lives in Redis (fast read).

---

## 2. Backend

### 2.1 Entry Point — `server.js`

When the server starts it:

1. Reads environment variables from `.env` (ports, URIs, passwords).
2. Connects to **MongoDB**, **Neo4j**, and **Redis** — all three must succeed or the process exits.
3. Registers Express middleware: JSON body parser, a simple request logger.
4. Mounts the five route groups.
5. Listens on `PORT` (3000 locally, 5000 in Docker).

On `SIGINT` (Ctrl-C / Docker stop) it closes the Neo4j driver and Redis client gracefully before exiting.

```
startServer()
  ├── connectMongoDB()   → MongoDB native driver, stored in module-level variable
  ├── connectNeo4j()     → neo4j-driver, Bolt protocol
  ├── connectRedis()     → node-redis v4, reconnect with exponential back-off
  └── app.listen(PORT)
```

### 2.2 Route Groups

Every URL prefix maps to one file:

| Prefix | File | Database |
|--------|------|----------|
| `/api/tasks` | `mongodbRoute_tasks.js` | MongoDB |
| `/api/projects` | `mongodbRoute_projects.js` | MongoDB |
| `/api/users` | `mongodbRoute_users.js` | MongoDB |
| `/api/relationships` | `neo4jRoute_relationships.js` | Neo4j |
| `/api/redis` | `RedisRoute_redis.js` | Redis |
| `/health` | inline in `server.js` | all three |

Each route file does three things: validate the request, call the controller, and format the response.

### 2.3 MongoDB — Tasks, Projects, Users

**Connection** (`mongodb_db.js`): The native MongoDB driver opens one connection pool. A module-level `db` variable is set once and exported via `getDB()` so every controller shares the same connection.

**Controllers** follow the same pattern:

```js
// simplified
async function createTask(data) {
  const db = getDB();
  const result = await db.collection('tasks').insertOne({ ...data, createdAt: new Date() });
  return { _id: result.insertedId, ...data };
}
```

**ObjectId** matters: MongoDB stores `_id`, `projectId`, and `createdBy` as `ObjectId` objects, not strings. The helper `toObjectId()` converts any incoming string to `ObjectId` before querying, so filters like `findOne({ _id: toObjectId(id) })` work correctly.

**Aggregation pipelines** are used for analytics:

- `getDashboardMetrics()` — matches tasks created in the last 30 days, groups by `status`, and calculates count + average completion days + average priority score. Returns `{ period, timestamp, metrics: [...] }`.
- `getOverdueTasksAlert()` — matches tasks where `status ≠ done` and `dueDate < now`, then does a `$lookup` join to the `users` collection to get the creator's username, groups by priority. Returns `{ alert, timestamp, data: [...] }`.

**Response shape** — every list endpoint wraps the array:

```json
{ "count": 9, "tasks": [ ... ] }
```

The frontend always unpacks via `data.tasks`, `data.projects`, `data.users`.

### 2.4 Neo4j — Relationships

**Connection** (`neo4j_db.js`): The neo4j-driver connects over the Bolt protocol. Helper functions `executeRead()` and `executeWrite()` open a session, run a Cypher query, collect the records, and close the session — so controllers never manage sessions manually.

**Data model** (graph nodes and edges):

```
(User)-[:ASSIGNED_TO]->(Task)
(Task)-[:BLOCKED_BY]->(Task)
(User)-[:MEMBER_OF]->(Project)
(User)-[:HAS_SKILL]->(Skill)
(User)-[:REPORTS_TO]->(User)
```

Nodes are created with the same ID string as the MongoDB ObjectId, so the two databases share the same identifier space without a join table.

**Path traversal** is where Neo4j shines. The blocking-chain query walks the `BLOCKED_BY` edges recursively to find the full dependency path for a task — something that would require multiple round-trips in a relational or document database.

**Skill recommendation** (`/api/relationships/recommend?skill=Node.js`) finds all users who have a given skill by traversing `(User)-[:HAS_SKILL]->(Skill {name: "Node.js"})`.

### 2.5 Redis — Caching & Data Structures

**Connection** (`redis_db.js`): Uses `node-redis` v4. Connects with exponential back-off retry. Exports thin wrappers (`set`, `get`, `del`, `hSet`, `zAdd`, `lPush`, `sAdd`, etc.) so controllers never touch the raw client.

**Six data structures in use:**

| Key pattern | Structure | Purpose |
|-------------|-----------|---------|
| `task:<id>` | String (JSON) | Cache a task document — avoids hitting MongoDB on repeated reads |
| `session:<id>` | String (JSON) | User session data with configurable TTL |
| `dashboard:metrics` | String (JSON) | Cache the aggregation pipeline result for 30 minutes |
| `leaderboard:users` | Sorted Set | Users ranked by tasks completed; `ZRANGE … WITHSCORES REV` reads top-N |
| `tasks:urgent` | Sorted Set | Tasks ranked by urgency score; same sorted-set pattern |
| `activity:<userId>` | List | Per-user event log; `LPUSH` + `LRANGE` keeps the 100 most recent entries |
| `tag:<name>` | Set | Unordered collection of task IDs sharing a tag |
| `user:<id>` | Hash | Cached user profile fields |

**TTL strategy**: every write also calls `client.expire(key, seconds)` so stale data never accumulates. Task cache expires in 5 minutes, sessions in 24 hours, activity feeds in 7 days.

---

## 3. Frontend

### 3.1 Technology Stack

| Tool | Role |
|------|------|
| React 18 | UI component tree, state management with hooks |
| Vite 5 | Dev server (HMR), production bundler |
| Vite proxy | Forwards `/api/*` and `/health` to the backend — no CORS |

No external UI library — all styling is plain CSS variables in `index.css`.

### 3.2 How the App Starts

```
index.html
  └── src/main.jsx          ReactDOM.createRoot → render
        └── ErrorBoundary   catches any render crash, shows error instead of blank screen
              └── App.jsx   header + nav + active page
```

`main.jsx` mounts the React tree inside `<div id="root">`. If any component throws during render (e.g., calling `.map()` on a non-array), `ErrorBoundary` catches it and renders the error message with the stack trace instead of a blank white screen.

### 3.3 Routing — Tab State in `App.jsx`

There is no URL router. Tab state is a single `useState('dashboard')` string in `App.jsx`. Clicking a nav button sets the active tab; the JSX conditionally renders the matching page component:

```jsx
{tab === 'dashboard' && <Dashboard />}
{tab === 'tasks'     && <Tasks onCountChange={setTaskCount} />}
// ...
```

Each page component is **only mounted when its tab is active**. This means data is fetched fresh every time you switch to a tab — no stale data problems, but also no cross-tab cache.

### 3.4 API Layer — `api.js`

A single `req(method, path, body)` function wraps `fetch`:

```js
async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);           // path is relative → Vite proxy
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
  return data;
}
```

- Paths are **relative** (`/api/tasks`, not `http://localhost:5000/api/tasks`). The Vite dev server proxy rewrites them to the backend URL.
- On non-2xx responses it throws, so every caller can use a simple `try/catch`.

### 3.5 Toast Notifications — `Toast.jsx`

A **module-level singleton** pattern:

```js
let _addToast = null;   // set by ToastContainer on mount

export function useToast() {
  return useCallback((msg, type) => _addToast?.(msg, type), []);
}
```

`ToastContainer` (rendered once in `App.jsx`) sets `_addToast` in a `useEffect`. Any component calls `const toast = useToast()` and then `toast('message', 'success')` — the notification appears in the bottom-right corner and auto-removes after 4 seconds.

### 3.6 Pages

#### Dashboard
Calls three endpoints in parallel on mount:
- `GET /health` → updates the three database health cards
- `GET /api/tasks/analytics/dashboard` → unwraps `d.data.metrics` array → KPI cards + metrics table
- `GET /api/tasks/analytics/overdue` → unwraps `d.data.data` array → overdue alerts panel

#### Tasks
- On mount: `GET /api/tasks` with query params → unwraps `data.tasks`
- Create: `POST /api/tasks` with full payload
- View modal: parallel `GET /api/tasks/:id` (unwraps `data.task`) + `GET /api/tasks/:id/comments` (unwraps `data.comments`)
- Comment: `POST /api/tasks/:id/comment`
- Delete: `DELETE /api/tasks/:id`

#### Projects / Users
Same CRUD pattern — load list on mount, create via form, delete per row. Users require `username + email + password` (all mandatory per the backend validator).

#### Neo4j
Two panels side-by-side:
- **Write panel**: four forms that POST to `/api/relationships/*` (assign, block, skill, member)
- **Read panel**: four query cards that GET from `/api/relationships/*` and render the JSON response in a `<pre>` block

#### Redis
The most complex page — six sections each managing their own state:
- Task cache: `POST /GET /DELETE /api/redis/task/:id`
- Session: `POST /GET /DELETE /api/redis/session/:id`
- Leaderboard: `GET /api/redis/leaderboard` → rendered as a ranked list with proportional bars; `POST /api/redis/leaderboard/:userId` to update score
- Urgent queue: `GET /api/redis/urgent` → sorted by `urgencyScore` desc; `POST /api/redis/urgent/:id` to enqueue
- Activity feed: `GET /api/redis/activity/:userId` → newest first; `POST` to log a new entry
- Tags: `GET /api/redis/tag/:name` → unwraps `data.tasks`; `POST` to add a task ID to a tag

---

## 4. Request Lifecycle — End to End

Here is what happens when you click **Create Task** in the Tasks tab:

```
1. Browser
   User fills the form and clicks "Create Task"
   React calls createTask() in Tasks.jsx

2. api.js — req('POST', '/api/tasks', body)
   fetch('/api/tasks', { method: 'POST', body: JSON.stringify({...}) })

3. Vite dev server proxy
   Sees path starts with /api → forwards to http://localhost:5000/api/tasks

4. Express router — POST /api/tasks
   Validates: title, projectId, createdBy must all be present
   If missing → 400 Bad Request

5. taskController.createTask(data)
   Converts projectId and createdBy strings → ObjectId
   Builds the task document with defaults (status='todo', priority='medium', createdAt=now)
   db.collection('tasks').insertOne(task)

6. MongoDB
   Inserts the document, returns insertedId

7. Route handler
   res.status(201).json({ message: 'Task created successfully', task })

8. Vite proxy → browser
   fetch() resolves with { message, task }
   req() returns the data object

9. Tasks.jsx
   toast('Task created', 'success')
   Clears the form
   Calls loadTasks() → GET /api/tasks → table re-renders with the new row
```

---

## 5. Docker Networking

All four services (`mongodb`, `neo4j`, `redis`, `api`) share the `task-network` bridge. Inside Docker, the API container reaches the databases by hostname (`mongodb:27017`, `neo4j:7687`, `redis:6379`) — the hostnames are the service names from `docker-compose.yml`.

From your laptop:
- API is exposed on `localhost:5000`
- MongoDB on `localhost:27017`
- Neo4j browser on `localhost:7474`
- Redis on `localhost:6379`

The frontend (running on your machine, not in Docker) talks to `localhost:5000` via the Vite proxy.

The API container uses a **health-check** (`curl -f http://localhost:5000/health`) so Docker knows when the app is ready. The `/health` endpoint pings all three databases and returns their status.

---

## 6. Data Flow Summary

```
User action in browser
        │
        ▼
React component (state, form)
        │
        ▼
api.js req() — relative fetch path
        │
        ▼
Vite proxy (:5173 → :5000)
        │
        ▼
Express route — validate inputs
        │
        ├──► MongoDB controller  ──► documents (tasks / projects / users)
        │
        ├──► Neo4j controller    ──► Cypher queries (relationships / graph)
        │
        └──► Redis controller    ──► in-memory structures (cache / session / sorted sets / lists / sets)
                │
                ▼
        JSON response
                │
                ▼
React unwraps wrapper object (data.tasks, data.projects, …)
                │
                ▼
setState() → component re-renders with new data
```
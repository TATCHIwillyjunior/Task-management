# Task Management System

A polyglot NoSQL Task Management API built with **MongoDB**, **Neo4j**, and **Redis**, served via **Express.js**.

---

## Project Architecture

```
                          ┌─────────────────────────────┐
                          │      Express.js REST API     │
                          │        (Port 5000)           │
                          └────────────┬────────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
              ▼                        ▼                        ▼
   ┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
   │    MongoDB      │     │     Neo4j        │     │     Redis       │
   │  (Document DB)  │     │   (Graph DB)     │     │   (Cache/KV)    │
   │                 │     │                  │     │                 │
   │ - Tasks         │     │ - Relationships  │     │ - Task Cache    │
   │ - Projects      │     │ - Dependencies   │     │ - Sessions      │
   │ - Users         │     │ - User-Task edges│     │ - Leaderboard   │
   └─────────────────┘     └──────────────────┘     │ - Activity Feed │
                                                    │ - Urgent Queue  │
                                                    │ - Tags & Counts │
                                                    └─────────────────┘
```

### What each database handles

| Database  | Purpose                                                         | Assigned to |
|-----------|-----------------------------------------------------------------|-------------|
| MongoDB   | Primary data store — tasks, projects, users                     | Kelyan      |
| Neo4j     | Graph relationships — task deps, assignments                    | Fred        |
| Redis     | Caching, sessions, leaderboard, activity feed, rate limiting    | Willy       |

---

## Folder Structure

```
Task-management/
├── BACK/                                  # Express API (backend)
│   ├── src/
│   │   ├── server.js                      # Express app entry point (port 5000 in Docker, 3000 local)
│   │   ├── controllers/
│   │   │   ├── MongoDb/
│   │   │   │   ├── taskController.js      # MongoDB CRUD + aggregation pipelines
│   │   │   │   ├── projectController.js   # Project CRUD
│   │   │   │   └── userController.js      # User CRUD
│   │   │   ├── Neo4j/
│   │   │   │   └── relationshipController.js  # Neo4j graph logic
│   │   │   └── Redis/
│   │   │       └── redisController.js     # Redis operations logic
│   │   ├── db/
│   │   │   ├── mongodb_db/
│   │   │   │   └── mongodb_db.js          # MongoDB connection
│   │   │   ├── neo4j_db/
│   │   │   │   └── neo4j_db.js            # Neo4j driver connection
│   │   │   └── redis_db/
│   │   │       └── redis_db.js            # Redis client + helper functions
│   │   └── routes/
│   │       ├── mongodbRoute/
│   │       │   ├── mongodbRoute_tasks.js      # /api/tasks
│   │       │   ├── mongodbRoute_projects.js   # /api/projects
│   │       │   └── mongodbRoute_users.js      # /api/users
│   │       ├── neo4jRoute/
│   │       │   └── neo4jRoute_relationships.js # /api/relationships
│   │       └── RedisRoute/
│   │           └── RedisRoute_redis.js    # /api/redis/*
│   ├── scripts/
│   │   └── seed-db.js                     # Seeds MongoDB, Neo4j, and Redis with sample data
│   ├── Dockerfile                         # Multi-stage production Docker image
│   ├── docker-compose.yml                 # Orchestrates all 4 services
│   └── .env.example                       # Environment variable template
│
└── FRONT/                                 # React + Vite frontend
    ├── index.html                         # Vite HTML entry point
    ├── vite.config.js                     # Vite config with API proxy (→ localhost:5000)
    ├── package.json
    └── src/
        ├── main.jsx                       # React root with ErrorBoundary
        ├── App.jsx                        # Tab router + header/nav
        ├── index.css                      # Global dark theme
        ├── api.js                         # Centralised fetch wrapper
        ├── components/
        │   ├── ErrorBoundary.jsx          # Catches render errors and displays them
        │   ├── Modal.jsx                  # Reusable modal overlay
        │   └── Toast.jsx                  # Global toast notification system
        └── pages/
            ├── Dashboard.jsx              # Health check, KPIs, analytics, overdue alerts
            ├── Tasks.jsx                  # Task CRUD, filters, comments modal
            ├── Projects.jsx               # Project CRUD table
            ├── Users.jsx                  # User CRUD table
            ├── Neo4j.jsx                  # Graph ops: assign, block, skills, team, path traversal
            └── Redis.jsx                  # Cache, sessions, leaderboard, urgent queue, activity, tags
```

---

## API Endpoints

### Core

| Method | Route      | Description                        |
|--------|------------|------------------------------------|
| GET    | `/`        | API info and available routes      |
| GET    | `/health`  | Health check for all three databases |

### MongoDB — Tasks `/api/tasks`

| Method | Route                            | Description                          |
|--------|----------------------------------|--------------------------------------|
| POST   | `/api/tasks`                     | Create a new task                    |
| GET    | `/api/tasks`                     | Get all tasks (filter by status, priority, projectId, createdBy) |
| GET    | `/api/tasks/:id`                 | Get task by ID                       |
| PUT    | `/api/tasks/:id`                 | Update task                          |
| DELETE | `/api/tasks/:id`                 | Delete task                          |
| POST   | `/api/tasks/:id/comment`         | Add comment to task                  |
| GET    | `/api/tasks/:id/comments`        | Get all comments on a task           |
| GET    | `/api/tasks/analytics/dashboard` | Aggregation: task metrics by status (last 30 days) |
| GET    | `/api/tasks/analytics/overdue`   | Aggregation: overdue tasks grouped by priority |

### MongoDB — Projects `/api/projects`

| Method | Route               | Description                          |
|--------|---------------------|--------------------------------------|
| POST   | `/api/projects`     | Create a new project                 |
| GET    | `/api/projects`     | Get all projects (filter by createdBy) |
| GET    | `/api/projects/:id` | Get project by ID                    |
| PUT    | `/api/projects/:id` | Update project                       |
| DELETE | `/api/projects/:id` | Delete project                       |

### MongoDB — Users `/api/users`

| Method | Route            | Description                          |
|--------|------------------|--------------------------------------|
| POST   | `/api/users`     | Create a new user                    |
| GET    | `/api/users`     | Get all users                        |
| GET    | `/api/users/:id` | Get user by ID                       |
| PUT    | `/api/users/:id` | Update user                          |
| DELETE | `/api/users/:id` | Delete user                          |

### Neo4j — `/api/relationships`

| Method | Route                                  | Description                                        |
|--------|----------------------------------------|----------------------------------------------------|
| POST   | `/api/relationships/assign`            | Assign a task to a user (`ASSIGNED_TO` edge)       |
| POST   | `/api/relationships/block`             | Mark a task as blocked by another (`BLOCKED_BY`)   |
| POST   | `/api/relationships/project/member`    | Add a user to a project (`MEMBER_OF`)              |
| POST   | `/api/relationships/skill`             | Add a skill to a user (`HAS_SKILL`)                |
| POST   | `/api/relationships/manager`           | Set a user's manager (`REPORTS_TO`)                |
| GET    | `/api/relationships/user/:userId/tasks`| Get all tasks assigned to a user                   |
| GET    | `/api/relationships/task/:taskId/blocking` | Path traversal: full blocking chain for a task |
| GET    | `/api/relationships/project/:id/team`  | Get all members of a project                       |
| GET    | `/api/relationships/recommend`         | Path traversal: recommend user by skill (`?skill=`) |

### Redis — `/api/redis`

| Method | Route                         | Description                                 |
|--------|-------------------------------|---------------------------------------------|
| GET    | `/api/redis/health`           | Redis connection health                     |
| GET    | `/api/redis/stats`            | All keys and total key count                |
| POST   | `/api/redis/flush`            | Flush all Redis keys                        |
| GET    | `/api/redis/task/:id`         | Get cached task                             |
| POST   | `/api/redis/task/:id`         | Cache task data (body: payload + `ttl`)     |
| DELETE | `/api/redis/task/:id`         | Invalidate task cache                       |
| GET    | `/api/redis/dashboard`        | Get cached dashboard metrics                |
| POST   | `/api/redis/dashboard`        | Cache dashboard metrics (TTL: 30 min)       |
| GET    | `/api/redis/urgent`           | Get urgent task queue (`?limit=N`)          |
| POST   | `/api/redis/urgent/:id`       | Add task to urgent queue (body: `score`, `ttl`) |
| GET    | `/api/redis/leaderboard`      | Get user leaderboard (`?top=N`)             |
| POST   | `/api/redis/leaderboard/:userId` | Update user score (body: `tasksCompleted`) |
| GET    | `/api/redis/activity/:userId` | Get user activity feed (`?limit=N`)         |
| POST   | `/api/redis/activity/:userId` | Log activity (body: `type`, `data`)         |
| GET    | `/api/redis/session/:id`      | Get session data                            |
| POST   | `/api/redis/session/:id`      | Store session (body: payload + `ttl`)       |
| DELETE | `/api/redis/session/:id`      | Invalidate session                          |
| GET    | `/api/redis/tag/:name`        | Get all tasks for a tag                     |
| POST   | `/api/redis/tag/:name`        | Add task to tag (body: `taskId`)            |
| GET    | `/api/redis/user/:userId/profile` | Get cached user profile (hash)          |
| POST   | `/api/redis/user/:userId/profile` | Cache user profile fields (hash)        |

---

## Redis Key Design

| Key Pattern              | Data Structure | TTL        | Purpose                        |
|--------------------------|----------------|------------|--------------------------------|
| `task:<id>`              | String (JSON)  | 5 min      | Cached task documents          |
| `dashboard:metrics`      | String (JSON)  | 30 min     | Aggregated dashboard data      |
| `session:<id>`           | String (JSON)  | 24 h       | User session storage           |
| `tasks:urgent`           | Sorted Set     | 5 min      | Tasks ranked by urgency score  |
| `leaderboard:users`      | Sorted Set     | 24 h       | Users ranked by tasks completed|
| `activity:<userId>`      | List           | 7 days     | Per-user activity log (max 100)|
| `tag:<name>`             | Set            | 24 h       | Tasks grouped by tag           |
| `user:<id>`              | Hash           | 10 min     | Cached user profile fields     |
| `views:<taskId>`         | String (int)   | 24 h       | Task view counter              |

---

## Quick Start

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- [Node.js](https://nodejs.org/) v18+

### Option 1 — Full Docker (recommended)

Everything runs inside Docker: MongoDB, Neo4j, Redis, and the API.

```bash
# 1. Start all 4 services (databases + API)
docker-compose up -d

# 2. Wait for containers to be healthy, then seed sample data
docker exec task-manager-api npm run seed
```

The API starts automatically via `nodemon` inside the `api` container.
It will be available at **`http://localhost:5000`**.

> Neo4j browser UI: `http://localhost:7474` (user: `neo4j`, password: `password`)

Then start the frontend in a separate terminal:

```bash
cd FRONT
npm install
npm run dev
```

The frontend will be available at **`http://localhost:5173`**.
The Vite proxy automatically forwards `/api/*` and `/health` to `http://localhost:5000`.

---

### Option 2 — Databases in Docker, API runs locally

Run only the three databases in Docker and start the API on your machine. Useful when you want faster restarts during development.

```bash
# 1. Start only the database services
docker-compose up -d mongodb neo4j redis

# 2. Install Node dependencies (in BACK/)
cd BACK
npm install

# 3. Copy environment file (already configured for localhost)
cp .env.example .env

# 4. Seed the databases
npm run seed

# 5. Start the API
npm run dev
```

The API will be available at **`http://localhost:3000`**.

> The `.env.example` already points to `localhost` for all three databases,
> which matches the ports Docker exposes (`27017`, `7687`, `6379`).

Then in a separate terminal start the frontend and update the proxy target:

```bash
cd FRONT
npm install
# Edit vite.config.js → change proxy target to http://localhost:3000
npm run dev
```

---

### Available scripts

#### Backend (`BACK/`)

| Script  | Command        | Description                       |
|---------|----------------|-----------------------------------|
| `start` | `npm start`    | Start production server           |
| `dev`   | `npm run dev`  | Start dev server with nodemon     |
| `test`  | `npm test`     | Run Jest test suite               |
| `seed`  | `npm run seed` | Seed all three databases          |

#### Frontend (`FRONT/`)

| Script    | Command          | Description                        |
|-----------|------------------|------------------------------------|
| `dev`     | `npm run dev`    | Start Vite dev server on port 5173 |
| `build`   | `npm run build`  | Production build to `dist/`        |
| `preview` | `npm run preview`| Preview the production build       |

---

## Environment Variables

Copy `.env.example` to `.env`. The defaults are set for **Option 2** (API runs locally, databases in Docker):

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://admin:password@localhost:27017/taskdb?authSource=admin
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
REDIS_URL=redis://localhost:6379
```

> For **Option 1** (full Docker), environment variables are injected directly by `docker-compose.yml` and the `.env` file is not used by the container.

---

## Docker Services

Defined in `docker-compose.yml`:

| Service   | Image            | Port(s)           | Volume          |
|-----------|------------------|-------------------|-----------------|
| `mongodb` | mongo:7.0        | 27017             | `mongo_data`    |
| `neo4j`   | neo4j:5.13       | 7687, 7474        | `neo4j_data`    |
| `redis`   | redis:7-alpine   | 6379              | `redis_data`    |
| `api`     | local Dockerfile | 5000              | `.:/app`        |

All services share the `task-network` bridge network. The API waits for all three databases to pass their healthchecks before starting.

The Dockerfile uses a **multi-stage build** (builder → production) with a non-root `nodejs` user and `dumb-init` for proper signal handling.

---

## Dependencies

| Package         | Version  | Purpose                      |
|-----------------|----------|------------------------------|
| `express`       | ^4.19.2  | HTTP server / routing        |
| `mongodb`       | ^6.6.2   | MongoDB native driver        |
| `neo4j-driver`  | ^5.20.0  | Neo4j Bolt driver            |
| `redis`         | ^4.6.14  | Redis client (node-redis v4) |
| `dotenv`        | ^16.4.5  | Environment variable loading |
| `nodemon`       | ^3.1.3   | Dev auto-restart (devDep)    |
| `jest`          | ^29.7.0  | Test runner (devDep)         |

---

## Team Branches

| Branch               | Owner  | Purpose                        |
|----------------------|--------|--------------------------------|
| `main`               | All    | Production-ready merges        |
| `develop`            | All    | Integration branch             |
| `dev-kelyan/mongodb` | Kelyan | MongoDB tasks, projects, users |
| `dev-fred/neo4j`     | Fred   | Neo4j relationships            |
| `dev-willy/redis`    | Willy  | Redis caching & sessions       |

---

## Frontend

The `FRONT/` directory contains a **React + Vite** single-page application that provides an interactive dashboard for the entire API.

### Pages

| Tab | Color | Features |
|-----|-------|----------|
| 🏠 Dashboard | — | Live health check for all 3 databases, KPI cards (total / in-progress / done / overdue tasks), 30-day analytics breakdown, overdue alerts grouped by priority |
| 📋 Tasks | MongoDB 🍃 | Create tasks with full field set, filter by status / priority / project / user, view detail modal with comments, delete |
| 📁 Projects | MongoDB 🍃 | Create and delete projects |
| 👤 Users | MongoDB 🍃 | Create (username + email + password + role) and delete users |
| 🔗 Neo4j | Neo4j 🕸️ | Assign task to user, set task blockers, add skills to users, add project members, query user tasks, blocking chain traversal, project team, skill-based user recommendation |
| ⚡ Redis | Redis ⚡ | Cache stats + flush, task cache CRUD, session storage CRUD, leaderboard (sorted set), urgent queue (sorted set), per-user activity feed (list), tag management (set) |

### Architecture

```
Browser (localhost:5173)
        │
        │  /api/*  →  Vite proxy
        │
        ▼
Express API (localhost:5000)
        │
   ┌────┼────┐
   ▼    ▼    ▼
MongoDB Neo4j Redis
```

The Vite dev server proxies all `/api/*` and `/health` requests to the backend so no CORS configuration is needed during development.

### API Response Shape Reference

All list endpoints return a wrapper object — the frontend unwraps these automatically:

| Endpoint | Response shape | Array field |
|----------|---------------|-------------|
| `GET /api/tasks` | `{ count, tasks }` | `tasks` |
| `GET /api/tasks/:id` | `{ task }` | `task` |
| `GET /api/tasks/:id/comments` | `{ comments }` | `comments` |
| `GET /api/tasks/analytics/dashboard` | `{ data: { metrics } }` | `data.metrics` |
| `GET /api/tasks/analytics/overdue` | `{ data: { data } }` | `data.data` |
| `GET /api/projects` | `{ count, projects }` | `projects` |
| `GET /api/users` | `{ count, users }` | `users` |
| `GET /api/redis/urgent` | `[{ taskId, urgencyScore }]` | direct array |
| `GET /api/redis/leaderboard` | `[{ rank, userId, tasksCompleted }]` | direct array |
| `GET /api/redis/activity/:userId` | `[{ type, data, timestamp }]` | direct array |
| `GET /api/redis/tag/:name` | `{ tag, tasks }` | `tasks` |

---

## Frontend Test Scenarios

### Prerequisites

```bash
# seed all three databases first
docker exec task-manager-api npm run seed
# then open the frontend
# http://localhost:5173
```

Run the tests **in order** — Tests 3 and 4 use IDs obtained in Tests 1–2.

---

### Seed Data Reference

After seeding, open each tab and locate the following rows. Copy their **full 24-character ID** from the ID column — you will paste these into later test steps.

**👤 Users tab** — look up by username:

| Variable | Username to find | Role |
|----------|-----------------|------|
| `{ALICE_ID}` | `alice` | manager |
| `{BOB_ID}` | `bob` | developer |
| `{CHARLIE_ID}` | `charlie` | developer |
| `{DIANA_ID}` | `diana` | designer |
| `{EVE_ID}` | `eve` | tester |

**📁 Projects tab** — look up by name:

| Variable | Project name to find |
|----------|----------------------|
| `{PROJ_WEBSITE_ID}` | `Website Redesign` |
| `{PROJ_API_ID}` | `API Enhancement` |
| `{PROJ_MOBILE_ID}` | `Mobile App` |
| `{PROJ_DB_ID}` | `Database Migration` |

**📋 Tasks tab** — look up by title:

| Variable | Task title to find |
|----------|-------------------|
| `{TASK_DOCS_ID}` | `Write API documentation` |
| `{TASK_AUTH_ID}` | `Create user authentication` |
| `{TASK_OVERDUE_ID}` | `Fix overdue task - Critical Database Issue` |

---

### Test 1 — Dashboard & Health Check

**Goal:** Verify all three databases are reachable and that seeded data appears correctly in the analytics panels.

**Tab:** 🏠 Dashboard

**Sample data / inputs:** none — this test is observation only.

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Click **Health** button (top-right) | MongoDB, Neo4j, and Redis cards turn green and show `healthy` |
| 2 | Read KPI row | `Total Tasks` = **9** · `In Progress` = **3** · `Done` = **5** · `Overdue` ≥ **1** |
| 3 | Read **Task Metrics (30d)** table | Three rows — `done` (5 tasks), `in-progress` (3 tasks), `todo` (1 task) with avg completion days filled in |
| 4 | Read **Overdue Alerts** panel | Priority `high` group present · entry *"Fix overdue task - Critical Database Issue"* shows **> 60 days overdue** |
| 5 | Click **↺ Refresh** | All panels reload with same values; no error toasts appear |

---

### Test 2 — User & Project CRUD (MongoDB)

**Goal:** Create a new user and a new project linked to that user, verify both appear in their tables, then delete them.

**Tab:** 👤 Users → 📁 Projects

#### Part A — Create user

Go to **👤 Users** tab and fill the form:

| Field | Sample value |
|-------|-------------|
| Username | `frank` |
| Email | `frank@nosql.dev` |
| Password | `Frank2026!` |
| Role | `member` |

Click **Create User**.

✅ Toast *"User created"* · row `frank` appears · copy the 24-char **ID** from the ID column → save as `{FRANK_ID}`.

#### Part B — Create project

Switch to **📁 Projects** tab:

| Field | Sample value |
|-------|-------------|
| Name | `NoSQL Demo Project` |
| Description | `Full-stack demo for all three databases` |
| Created By | `{FRANK_ID}` ← paste frank's ID here |

Click **Create Project**.

✅ Toast *"Project created"* · row *NoSQL Demo Project* appears · copy its **Project ID** → save as `{PROJ_DEMO_ID}`.

#### Part C — Verify & delete

| Step | Action | Expected |
|------|--------|---------|
| 1 | Read the *NoSQL Demo Project* row | Project ID column shows `{PROJ_DEMO_ID}` · Created By shows `{FRANK_ID}` |
| 2 | Click **Delete** on *NoSQL Demo Project* | Toast *"Project deleted"* · row disappears |
| 3 | Switch to **👤 Users**, click **Delete** on `frank` | Toast *"User deleted"* · row disappears |

---

### Test 3 — Task Lifecycle & Comments (MongoDB)

**Goal:** Create a task, filter the list, open the detail modal, post a comment, then delete.

**Prerequisites:** Copy `{ALICE_ID}` and `{PROJ_WEBSITE_ID}` from the Seed Data Reference table above.

**Tab:** 📋 Tasks

#### Part A — Create task

| Field | Sample value |
|-------|-------------|
| Title | `Integrate Redis cache layer` |
| Description | `Add cache-aside pattern to all GET endpoints` |
| Status | `in-progress` |
| Priority | `high` |
| Due Date | `2026-06-01` |
| Project ID | `{PROJ_WEBSITE_ID}` ← paste Website Redesign's ID |
| Created By | `{ALICE_ID}` ← paste alice's ID |

Click **Create Task**.

✅ Toast *"Task created"* · new row appears at top of table.

#### Part B — Filter the table

| Filter field | Sample value |
|---|---|
| Filter Status | `in-progress` |
| Priority | `high` |
| Project ID | *(leave blank)* |
| Created By | *(leave blank)* |

Click **Search**.

✅ Table shows only high-priority in-progress tasks. Visible rows: *Integrate Redis cache layer*, *Implement responsive layout*, *Create user authentication*.

#### Part C — View detail & post comment

1. Click **View** on *Integrate Redis cache layer*.
2. Modal opens showing status badge `in-progress`, priority `high`, due `6/1/2026`.
3. Fill the comment form:

| Field | Sample value |
|---|---|
| Author ID | `{ALICE_ID}` ← paste alice's ID |
| Comment | `Cache-aside pattern preferred — invalidate on write, repopulate on miss` |

Click **Post**.

✅ Comment appears in the list with alice's short ID and today's date.

#### Part D — Delete

Click **Delete Task** in the modal footer.

✅ Toast *"Task deleted"* · modal closes · task no longer in table after next refresh.

---

### Test 4 — Neo4j Graph Operations

**Goal:** Build a graph of assignments, blockers, and skills, then query it with all four read operations.

**Prerequisites:** Copy `{BOB_ID}`, `{TASK_DOCS_ID}`, `{TASK_AUTH_ID}`, and `{PROJ_API_ID}` from the Seed Data Reference table above.

**Tab:** 🔗 Neo4j

#### Step 1 — Assign task to user

| Field | Sample value |
|---|---|
| Task ID | `{TASK_DOCS_ID}` ← *Write API documentation* |
| User ID | `{BOB_ID}` ← bob |

Click **Assign**.

✅ Toast *"Task assigned"*.

#### Step 2 — Set task blocker

| Field | Sample value |
|---|---|
| Blocked Task ID | `{TASK_AUTH_ID}` ← *Create user authentication* |
| Blocker Task ID | `{TASK_DOCS_ID}` ← *Write API documentation* |

Click **Set Blocker**.

✅ Toast *"Blocker set"* — auth cannot proceed until docs are done.

#### Step 3 — Add skill to user

| Field | Sample value |
|---|---|
| User ID | `{BOB_ID}` ← bob |
| Skill | `Redis` |

Click **Add Skill**.

✅ Toast *"Skill added"*.

#### Step 4 — Add user to project

| Field | Sample value |
|---|---|
| Project ID | `{PROJ_API_ID}` ← *API Enhancement* |
| User ID | `{BOB_ID}` ← bob |

Click **Add Member**.

✅ Toast *"Member added"*.

#### Step 5 — Query: tasks assigned to bob

| Field | Sample value |
|---|---|
| User ID | `{BOB_ID}` |

Click **Load** in *Tasks assigned to user*.

✅ JSON result contains an entry with title `"Write API documentation"`.

#### Step 6 — Query: blocking chain

| Field | Sample value |
|---|---|
| Task ID | `{TASK_AUTH_ID}` |

Click **Load** in *Blocking chain for task*.

✅ JSON shows the blocker chain: *Create user authentication* ← blocked by → *Write API documentation*.

#### Step 7 — Query: skill recommendation

| Field | Sample value |
|---|---|
| Skill | `Node.js` |

Click **Find** in *Recommend user by skill*.

✅ JSON contains `bob` (seeded with `Node.js` and `MongoDB` skills).

#### Step 8 — Query: project team

| Field | Sample value |
|---|---|
| Project ID | `{PROJ_API_ID}` |

Click **Load** in *Project team members*.

✅ JSON list contains `bob` (seeded as `MEMBER_OF` API Enhancement + just added in Step 4).

---

### Test 5 — Redis Data Structures

**Goal:** Exercise all six Redis data structures — string cache, string session, sorted-set leaderboard, sorted-set urgent queue, list activity feed, and set tags.

**Tab:** ⚡ Redis

#### Step 1 — Health & stats baseline

Click **↺ Stats**.

✅ `Redis Health` = `ok` · `Total Keys` ≥ 6 · key pills include `leaderboard:users`, `session:user_alice`, `tag:urgent`, `tag:backend`, `tag:frontend`, `activity:alice_id`.

Note the **Total Keys** number — you will compare it at the end of this test.

#### Step 2 — Task cache (String)

In **📦 Task Cache**, enter:

| Field | Sample value |
|---|---|
| Task ID | `demo-task-001` |
| TTL (s) | `300` |
| Payload (JSON) | `{"title":"Cache test task","status":"todo","priority":"high","projectId":"proj-website"}` |

Click **Cache**.
✅ Result: `{ "success": true, "key": "task:demo-task-001", "ttl": 300 }`

Click **Get** (same Task ID).
✅ Payload object displayed: `{ "title": "Cache test task", ... }`

Click **Invalidate** (same Task ID).
✅ Result: `{ "success": true, "invalidated": "task:demo-task-001" }`

Click **Get** again.
✅ Result is `null` — cache entry gone.

#### Step 3 — Session storage (String)

In **🔐 Session Storage**, enter:

| Field | Sample value |
|---|---|
| Session ID | `sess-alice-2026` |
| TTL (s) | `3600` |
| Payload (JSON) | `{"userId":"alice_id","username":"alice","role":"manager","loginAt":"2026-05-07T09:00:00Z"}` |

Click **Store**.
✅ Result: `{ "success": true, "sessionId": "sess-alice-2026", "ttl": 3600 }`

Click **Get** (same Session ID).
✅ Full payload displayed.

Click **Invalidate** (same Session ID).
✅ Result: `{ "success": true, "invalidated": "sess-alice-2026" }`

#### Step 4 — Leaderboard (Sorted Set)

Set `Top N` = `5`, click **Load**.

✅ Five ranked rows (seeded):

| Rank | User | Score |
|------|------|-------|
| 🥇 1 | `alice` | 25 |
| 🥈 2 | `bob` | 18 |
| 🥉 3 | `charlie` | 12 |
| 4 | `diana` | 8 |
| 5 | `eve` | 5 |

Click **+ Score**, enter:

| Field | Sample value |
|---|---|
| User ID | `charlie` |
| Tasks Done | `10` |

Click **Submit**, then **Load** again.

✅ Charlie's score is now **22**, row order becomes: alice (25) · charlie (22) · bob (18) · diana (8) · eve (5).

Add a brand-new user to the leaderboard:

| Field | Sample value |
|---|---|
| User ID | `frank` |
| Tasks Done | `7` |

Click **Submit**, then **Load**.

✅ `frank` appears with score **7** (between diana and eve).

#### Step 5 — Urgent queue (Sorted Set)

Click **+ Enqueue**, enter first task:

| Field | Sample value |
|---|---|
| Task ID | `task-critical-001` |
| Score | `98` |

Click **Add**.
✅ Row appears: `task-critical-001` — **98**

Enqueue second task:

| Field | Sample value |
|---|---|
| Task ID | `task-medium-002` |
| Score | `55` |

Click **Add**.

Enqueue third task:

| Field | Sample value |
|---|---|
| Task ID | `task-low-003` |
| Score | `20` |

Click **Add**.

Set `Limit` = `10`, click **Load**.

✅ Tasks listed highest-score-first:
1. `task-critical-001` — **98**
2. `task-medium-002` — **55**
3. `task-low-003` — **20**

#### Step 6 — Activity feed (List)

In **📜 Activity Feed**, enter:

| Field | Sample value |
|---|---|
| User ID | `alice_id` |
| Limit | `10` |

Click **Load**.

✅ Two seeded entries appear:
- `task_completed` — `{ "taskId": "task_1" }`
- `user_joined_project` — `{ "projectId": "project_1" }`

Now log three new entries one at a time:

**Entry 1:**

| Field | Sample value |
|---|---|
| Log Type | `task_created` |
| Data (JSON) | `{"taskId":"demo-task-001","title":"Cache test task","priority":"high"}` |

Click **Log**.

**Entry 2:**

| Field | Sample value |
|---|---|
| Log Type | `comment_posted` |
| Data (JSON) | `{"taskId":"demo-task-001","text":"Cache-aside pattern preferred here"}` |

Click **Log**.

**Entry 3:**

| Field | Sample value |
|---|---|
| Log Type | `task_deleted` |
| Data (JSON) | `{"taskId":"demo-task-001","reason":"test cleanup"}` |

Click **Log**.

Click **Load** again.

✅ Feed shows 5 entries total, newest first: `task_deleted` · `comment_posted` · `task_created` · `task_completed` · `user_joined_project`.

#### Step 7 — Tags (Set)

In **🏷️ Tags**, enter:

| Field | Sample value |
|---|---|
| Tag Name | `urgent` |

Click **Get Tasks**.

✅ Pills displayed: `task_1` · `task_5` · `task_9` (seeded values).

Add a new task to the same tag:

| Field | Sample value |
|---|---|
| Tag Name | `urgent` |
| Task ID to add | `task-critical-001` |

Click **Add to Tag**, then **Get Tasks**.

✅ Pills now include `task-critical-001` alongside the seeded ones.

Query a different tag:

| Field | Sample value |
|---|---|
| Tag Name | `backend` |

Click **Get Tasks**.

✅ Pills: `task_2` · `task_3` · `task_7` (seeded for backend tag).

#### Step 8 — Final stats check

Click **↺ Stats**.

✅ `Total Keys` is **higher** than the value noted in Step 1 (new keys: `tasks:urgent`, `activity:alice_id` entries added, `leaderboard:users` updated).

---

## Changelog

### `dev-willy/redis` — feat(frontend): React + Vite interactive dashboard

- **`FRONT/`** — New React + Vite single-page application covering the full API surface.
- **`FRONT/vite.config.js`** — Vite proxy forwards `/api/*` and `/health` to `http://localhost:5000` (Docker port), eliminating CORS issues in development.
- **`FRONT/src/api.js`** — Centralised `req()` fetch wrapper used by all pages; throws on non-OK responses with the server's error message.
- **`FRONT/src/components/ErrorBoundary.jsx`** — Class-based error boundary that catches render errors and displays the stack trace instead of a blank screen.
- **`FRONT/src/components/Toast.jsx`** — Module-level singleton toast system; any component can call `useToast()` to fire success / error / info notifications.
- **`FRONT/src/components/Modal.jsx`** — Reusable overlay modal (click-outside to close).
- **`FRONT/src/pages/Dashboard.jsx`** — Polls `/health`, `/api/tasks/analytics/dashboard`, and `/api/tasks/analytics/overdue` on mount; displays KPI cards and a grouped overdue alert panel. Fixed double-nested response unwrapping (`d.data.metrics`, `d.data.data`).
- **`FRONT/src/pages/Tasks.jsx`** — Full CRUD with filter bar; opens a detail modal with comments list and inline comment form. Unwraps `{ count, tasks }` and `{ task }` / `{ comments }` response shapes.
- **`FRONT/src/pages/Projects.jsx`** — Create / delete projects. Unwraps `{ count, projects }`. `createdBy` is required by the backend.
- **`FRONT/src/pages/Users.jsx`** — Create / delete users. Unwraps `{ count, users }`. Added required `password` field (backend enforces `username + email + password`).
- **`FRONT/src/pages/Neo4j.jsx`** — Write panel (assign, block, skill, project-member) and read panel (user tasks, blocking chain, project team, skill recommendation). Results rendered as formatted JSON.
- **`FRONT/src/pages/Redis.jsx`** — Task cache CRUD, session CRUD, leaderboard (sorted set with bar chart), urgent queue (sorted set), per-user activity feed (list with type icons), tag management (set). Fixed `urgencyScore` field name for urgent queue items and `{ tag, tasks }` shape for tags.

---

### `dev-willy/redis` — fix Docker startup and seeding

- **`docker-compose.yml`** — removed two broken volume mounts (`./scripts/mongo-init.js` and `./scripts/neo4j-init.cypher`) that were empty directories on disk, causing MongoDB to crash on startup with `EISDIR: illegal operation on a directory`.
- **`docker-compose.yml`** — added `?authSource=admin` to `MONGODB_URI` in the `api` service environment. Without it the driver looked for the `admin` user in the `taskdb` database instead of the `admin` database, causing `Authentication failed` when running `npm run seed`.
- **`scripts/`** — deleted the two empty directories (`mongo-init.js`, `neo4j-init.cypher`) that were mistakenly created as directories instead of files. Seeding is handled entirely by `seed-db.js`.

---

### `dev-willy/redis` — rebase onto develop

- Rebased `dev-willy/redis` onto `origin/develop` to pull in changes merged by Kelyan (MongoDB) and Fred (Neo4j).
- Resolved conflicts in 4 files — all caused by mismatched `require` paths and informal comments on the develop branch:
  - **`src/controllers/MongoDb/taskController.js`** — kept correct `require('../../db/mongodb_db/mongodb_db')` path and preserved full function set (`addComment`, `getDashboardMetrics`, `getOverdueTasksAlert`) that was missing from develop.
  - **`src/controllers/Neo4j/relationshipController.js`** — kept correct `require('../../db/neo4j_db/neo4j_db')` path and restored missing `return` statement in `createTask`.
  - **`src/db/neo4j_db/neo4j_db.js`** — kept formatted section headers over informal inline comments.
  - **`src/routes/mongodbRoute/mongodbRoute_tasks.js`** — kept correct `require('../../controllers/MongoDb/taskController')` path.

---

### `dev-willy/redis` — feat(redis)

- **`src/db/redis_db/redis_db.js`** — Redis client using `node-redis` v4 with exponential reconnect strategy, connection verification via `PING`, and graceful disconnect. Exports helper wrappers for all data structure operations: `set`/`get`/`del`/`exists`/`getKeys`/`incr` (strings), `hSet`/`hGetAll` (hashes), `zAdd`/`zRange` (sorted sets), `lPush`/`lRange` (lists), `sAdd`/`sMembers` (sets), `flushAll`.

- **`src/controllers/Redis/redisController.js`** — Controller layer covering:
  - Task cache (`cacheTaskData`, `getCachedTask`, `invalidateTaskCache`)
  - Dashboard metrics cache (`cacheDashboardMetrics`, `getCachedDashboardMetrics`)
  - Urgent task queue via sorted set (`addTaskToUrgentQueue`, `getUrgentTasks`)
  - User productivity leaderboard via sorted set (`updateUserLeaderboard`, `getLeaderboard`)
  - Per-user activity feed via list with auto-trim to 100 entries (`addActivityLog`, `getUserActivityFeed`)
  - Session storage (`storeSession`, `getSession`, `invalidateSession`)
  - Tag grouping via set (`addTaskToTag`, `getTasksByTag`)
  - User profile cache via hash (`cacheUserProfile`, `getCachedUserProfile`)
  - View counter via `INCR` (`incrementViewCount`)
  - Health check and stats (`getRedisHealth`, `getRedisStats`, `flushAllCache`)

- **`src/routes/RedisRoute/RedisRoute_redis.js`** — 21 REST endpoints mounted at `/api/redis`.

- **`src/server.js`** — Fixed `require` paths for all db modules and routes to use correct subdirectory paths. Added Redis connection on startup and graceful shutdown handling. Registered `/api/redis` route.

- **`Dockerfile`** — Multi-stage build (Node 18 Alpine), non-root user, `dumb-init`, built-in HTTP healthcheck.

- **`docker-compose.yml`** — Full service orchestration for MongoDB 7, Neo4j 5.13, Redis 7 Alpine, and the API. All services use named volumes, health checks, and a shared bridge network.

- **`scripts/seed-db.js`** — Database seeder for all three databases with sample users, tasks, and Redis data.

- **`package.json`** — Added `seed` script (`node scripts/seed-db.js`); confirmed all runtime dependencies.
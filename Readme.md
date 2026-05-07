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
   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
   │    MongoDB       │     │     Neo4j        │     │     Redis       │
   │  (Document DB)  │     │   (Graph DB)     │     │   (Cache/KV)   │
   │                 │     │                  │     │                 │
   │ - Tasks         │     │ - Relationships  │     │ - Task Cache    │
   │ - Projects      │     │ - Dependencies   │     │ - Sessions      │
   │ - Users         │     │ - User-Task edges│     │ - Leaderboard   │
   └─────────────────┘     └─────────────────┘     │ - Activity Feed │
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
├── src/
│   ├── server.js                          # Express app entry point
│   ├── controllers/
│   │   ├── MongoDb/
│   │   │   └── taskController.js          # MongoDB CRUD logic
│   │   ├── Neo4j/
│   │   │   └── relationshipController.js  # Neo4j graph logic
│   │   └── Redis/
│   │       └── redisController.js         # Redis operations logic
│   ├── db/
│   │   ├── mongodb_db/
│   │   │   └── mongodb_db.js              # MongoDB connection
│   │   ├── neo4j_db/
│   │   │   └── neo4j_db.js               # Neo4j driver connection
│   │   └── redis_db/
│   │       └── redis_db.js               # Redis client + helper functions
│   └── routes/
│       ├── mongodbRoute/
│       │   └── mongodbRoute_tasks.js      # /api/tasks, /api/projects, /api/users
│       ├── neo4jRoute/
│       │   └── neo4jRoute_relationships.js # /api/relationships
│       └── RedisRoute/
│           └── RedisRoute_redis.js        # /api/redis/*
├── scripts/
│   └── seed-db.js                         # Seeds MongoDB, Neo4j, and Redis with sample data
├── Dockerfile                             # Multi-stage production Docker image
├── docker-compose.yml                     # Orchestrates all 4 services
├── .env.example                           # Environment variable template
├── .gitignore
└── Readme.md
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

---

### Option 2 — Databases in Docker, API runs locally

Run only the three databases in Docker and start the API on your machine. Useful when you want faster restarts during development.

```bash
# 1. Start only the database services
docker-compose up -d mongodb neo4j redis

# 2. Install Node dependencies
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

---

### Available scripts

| Script        | Command           | Description                          |
|---------------|-------------------|--------------------------------------|
| `start`       | `npm start`       | Start production server              |
| `dev`         | `npm run dev`     | Start dev server with nodemon        |
| `test`        | `npm test`        | Run Jest test suite                  |
| `seed`        | `npm run seed`    | Seed all three databases             |

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

## Changelog

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
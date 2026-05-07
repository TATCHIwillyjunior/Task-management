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

### MongoDB — `/api/tasks`, `/api/projects`, `/api/users`

| Method | Route           | Description              |
|--------|-----------------|--------------------------|
| GET    | `/api/tasks`    | Task CRUD operations     |
| GET    | `/api/projects` | Project management       |
| GET    | `/api/users`    | User management          |

### Neo4j — `/api/relationships`

| Method | Route                  | Description                    |
|--------|------------------------|--------------------------------|
| *      | `/api/relationships`   | Graph relationship operations  |

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

### Run with Docker (recommended)

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Start all services (MongoDB, Neo4j, Redis, API)
docker-compose up -d

# 3. Seed the databases with sample data
npm run seed

# 4. Start dev server (auto-restarts on file change)
npm run dev
```

The API will be available at `http://localhost:3000`.

### Run locally (without Docker)

```bash
# 1. Install dependencies
npm install

# 2. Copy and edit environment variables
cp .env.example .env

# 3. Start dev server (auto-restarts on file change)
npm run dev
```

### Available scripts

| Script        | Command           | Description                          |
|---------------|-------------------|--------------------------------------|
| `start`       | `npm start`       | Start production server              |
| `dev`         | `npm run dev`     | Start dev server with nodemon        |
| `test`        | `npm test`        | Run Jest test suite                  |
| `seed`        | `npm run seed`    | Seed all three databases             |

---

## Environment Variables

Copy `.env.example` to `.env` and adjust the values:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://admin:password@mongodb:27017/taskdb
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
REDIS_URL=redis://redis:6379
```

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
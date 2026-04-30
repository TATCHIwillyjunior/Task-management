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
   │ - Tasks         │     │ - Relationships  │     │ - Sessions      │
   │ - Projects      │     │ - Dependencies   │     │ - Caching       │
   │ - Users         │     │ - User-Task edges│     │ - Rate limiting │
   └─────────────────┘     └─────────────────┘     └─────────────────┘
```

### What each database handles

| Database  | Purpose                                       | Assigned to |
|-----------|-----------------------------------------------|-------------|
| MongoDB   | Primary data store — tasks, projects, users   | Kelyan      |
| Neo4j     | Graph relationships — task deps, assignments  | Fred        |
| Redis     | Caching, sessions, pub/sub, rate limiting     | Willy       |

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
│   │       └── redis_db.js               # Redis client connection
│   └── routes/
│       ├── mongodbRoute/
│       │   └── mongodbRoute_tasks.js      # /api/tasks, /api/projects, /api/users
│       ├── neo4jRoute/
│       │   └── neo4jRoute_relationships.js # /api/relationships
│       └── RedisRoute/
│           └── RedisRoute_redis.js        # /api/redis
├── scripts/                               # Seed / migration scripts
├── .env.example                           # Environment variable template
├── .gitignore
└── Readme.md
```

---

## API Endpoints

| Method | Route                  | Database  | Description                   |
|--------|------------------------|-----------|-------------------------------|
| GET    | `/health`              | All       | Health check for all databases|
| GET    | `/`                    | —         | API info and available routes |
| *      | `/api/tasks`           | MongoDB   | Task CRUD operations          |
| *      | `/api/projects`        | MongoDB   | Project management            |
| *      | `/api/users`           | MongoDB   | User management               |
| *      | `/api/relationships`   | Neo4j     | Graph relationship operations |
| *      | `/api/redis`           | Redis     | Redis cache / session ops     |

---

## Quick Start

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- [Node.js](https://nodejs.org/) v18+

### Run with Docker

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Start databases
docker-compose up -d

# 3. Install dependencies
npm install

# 4. Seed the database (if available)
npm run seed

# 5. Start the server
npm start
```

The API will be available at `http://localhost:5000`.

### Environment Variables

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

## Team Branches

| Branch               | Owner  | Purpose                        |
|----------------------|--------|--------------------------------|
| `main`               | All    | Production-ready merges        |
| `develop`            | All    | Integration branch             |
| `dev-kelyan/mongodb` | Kelyan | MongoDB tasks, projects, users |
| `dev-fred/neo4j`     | Fred   | Neo4j relationships            |
| `dev-willy/redis`    | Willy  | Redis caching & sessions       |

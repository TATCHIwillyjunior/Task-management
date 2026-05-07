# Project Report — Task Management System

## Project Idea

The Task Management System is a polyglot NoSQL REST API that lets teams create, track, and manage tasks across projects. Users can be assigned to tasks, tasks can block each other, and the system tracks activity, caching, and productivity analytics in real time.

The architecture uses three databases, each chosen for what it does best:
- **MongoDB** stores the primary document data (tasks, projects, users)
- **Neo4j** models the relationships between those entities as a graph
- **Redis** accelerates the system with caching, sessions, leaderboards, and activity feeds

The API is served by Express.js and the full stack runs with a single `docker-compose up` command.

---

## How to Run

### Prerequisites
- [Docker](https://www.docker.com/) and Docker Compose
- [Node.js](https://nodejs.org/) v18+

### Option 1 — Full Docker (recommended)

```bash
# Start all 4 services (MongoDB, Neo4j, Redis, API)
docker-compose up -d

# Seed the databases with sample data
docker exec task-manager-api npm run seed
```

API available at `http://localhost:5000`

### Option 2 — Databases in Docker, API local

```bash
# Start only the three databases
docker-compose up -d mongodb neo4j redis

# Install dependencies and configure environment
npm install
cp .env.example .env

# Seed then start the API
npm run seed
npm run dev
```

API available at `http://localhost:3000`

### Sample Data

Running `npm run seed` populates all three databases:
- **MongoDB:** 5 users, 4 projects, 9 tasks
- **Neo4j:** 5 user nodes, 9 task nodes, 4 project nodes, 8 skill nodes + all relationships
- **Redis:** sessions, user profiles, leaderboard, activity feeds, tag sets

---

## Database Use Cases

### MongoDB

**Role:** Primary document store for all structured application data — tasks, projects, and users. Each entity is stored as a JSON document in its own collection. MongoDB was chosen because tasks naturally have nested data (comments, metadata) and flexible schemas that grow over time without migrations.

**Driver used:** `mongodb` (native Node.js driver — no Mongoose)

**Collections and API endpoints:**

| Collection | Fields | Endpoints |
|---|---|---|
| `tasks` | title, description, status, priority, dueDate, projectId, createdBy, comments[] | `POST/GET /api/tasks`, `GET/PUT/DELETE /api/tasks/:id`, comments via `/api/tasks/:id/comment` |
| `projects` | name, description, createdBy, members[] | `POST/GET /api/projects`, `GET/PUT/DELETE /api/projects/:id` |
| `users` | username, email, password, role | `POST/GET /api/users`, `GET/PUT/DELETE /api/users/:id` |

Indexes created on startup: `projectId`, `createdBy`, `status`, `dueDate` on tasks; `email` (unique) and `username` on users; `createdBy` on projects.

---

#### Aggregation Pipeline 1 — Dashboard Metrics

**Endpoint:** `GET /api/tasks/analytics/dashboard`

**Purpose:** Provides a real-time summary of task activity for the last 30 days, broken down by status. Used to populate a management dashboard showing how many tasks are in each stage, how long they typically take, and the average priority level.

**Pipeline stages:**

| Stage | Operator | What it does |
|-------|----------|--------------|
| 1 | `$match` | Filters tasks created in the last 30 days |
| 2 | `$group` | Groups by `status`, counts tasks, calculates average completion time (updatedAt − createdAt) and average priority score |
| 3 | `$project` | Renames fields, rounds numeric values to 1–2 decimal places |
| 4 | `$sort` | Sorts results alphabetically by status |

**Sample output:**
```json
{
  "period": "Last 30 days",
  "metrics": [
    { "status": "done", "taskCount": 12, "avgCompletionDays": 3.2, "avgPriorityScore": 2.1 },
    { "status": "in-progress", "taskCount": 7, "avgCompletionDays": 1.5, "avgPriorityScore": 2.6 },
    { "status": "todo", "taskCount": 5, "avgCompletionDays": 0, "avgPriorityScore": 1.8 }
  ]
}
```

---

#### Aggregation Pipeline 2 — Overdue Tasks Alert

**Endpoint:** `GET /api/tasks/analytics/overdue`

**Purpose:** Identifies all tasks that are past their due date and not yet completed. Results are grouped by priority so managers can immediately see which high-priority tasks need attention. The pipeline also joins user data to show who owns each overdue task.

**Pipeline stages:**

| Stage | Operator | What it does |
|-------|----------|--------------|
| 1 | `$match` | Filters tasks where `status != done` AND `dueDate < now` |
| 2 | `$lookup` | Joins the `users` collection on `createdBy` to get the owner's username |
| 3 | `$unwind` | Flattens the joined user array into a single object per task |
| 4 | `$group` | Groups by `priority`, counts overdue tasks, builds a list with days overdue per task |
| 5 | `$sort` | Sorts by priority descending (high first) |
| 6 | `$project` | Cleans the output, rounds daysOverdue to 1 decimal |

**Sample output:**
```json
{
  "alert": "Overdue Tasks",
  "data": [
    {
      "priority": "high",
      "overduCount": 3,
      "tasks": [
        { "title": "Deploy API", "daysOverdue": 5.0, "createdBy": "alice", "status": "in-progress" }
      ]
    }
  ]
}
```

---

### Neo4j

**Role:** Graph database that models the relationships between users, tasks, projects, and skills. MongoDB stores the data documents; Neo4j stores how those entities connect. This separation makes graph queries (who is blocking whom, who can do this task, who is on this team) fast and natural to express in Cypher.

**Driver used:** `neo4j-driver` (native Bolt driver — no ORM)

**Node types:** `User`, `Task`, `Project`, `Skill`

**Relationship types:**

| Relationship | Direction | Meaning |
|---|---|---|
| `ASSIGNED_TO` | User → Task | User is responsible for a task |
| `BLOCKED_BY` | Task → Task | Task cannot start until blocking task is done |
| `MEMBER_OF` | User → Project | User belongs to a project team |
| `HAS_SKILL` | User → Skill | User has a particular skill |
| `REPORTS_TO` | User → User | Organisational hierarchy |

---

#### Path Traversal Query 1 — Task Blocking Chain

**Endpoint:** `GET /api/relationships/task/:taskId/blocking`

**Cypher query:**
```cypher
MATCH (targetTask:Task {id: $taskId})
OPTIONAL MATCH path = (targetTask)-[:BLOCKED_BY*1..10]->(blocker:Task)
RETURN
  targetTask.title AS taskTitle,
  targetTask.id AS taskId,
  COUNT(DISTINCT blocker) AS blockingTaskCount,
  COLLECT(DISTINCT {
    blockingTaskId: blocker.id,
    blockingTaskTitle: blocker.title,
    blockingTaskStatus: blocker.status,
    depth: LENGTH(path)
  }) AS blockingTasks
```

**What it returns:** The full chain of tasks that block the given task, up to 10 levels deep. Each blocker includes its status and how many hops away it is.

**Why it is useful:** In project management, tasks often depend on each other. This query exposes the full dependency tree for any task in a single call — something that would require multiple recursive queries in a relational database. A team lead can instantly see if a task is stuck because of a long chain of unfinished dependencies, and at what depth the actual blocker sits.

---

#### Path Traversal Query 2 — Skill-Based Person Recommendation

**Endpoint:** `GET /api/relationships/recommend?skill=<skillName>`

**Cypher query (simplified):**
```cypher
MATCH (requiredSkill:Skill {name: $skillRequired})
OPTIONAL MATCH (candidate:User)-[:HAS_SKILL]->(requiredSkill)
OPTIONAL MATCH (candidate)-[:ASSIGNED_TO]->(assignedTask:Task)
  WHERE assignedTask.status <> "done"
OPTIONAL MATCH (candidate)-[:REPORTS_TO]->(manager:User)
WITH candidate, manager, COUNT(DISTINCT assignedTask) AS currentWorkload
WHERE candidate IS NOT NULL
RETURN
  candidate.username, candidate.id, currentWorkload,
  CASE
    WHEN currentWorkload < 3 THEN "AVAILABLE"
    WHEN currentWorkload < 6 THEN "MODERATE"
    ELSE "OVERLOADED"
  END AS workloadStatus,
  (10 - currentWorkload) AS recommendationScore
ORDER BY currentWorkload ASC
LIMIT 5
```

**What it returns:** Up to 5 users who have the required skill, ranked by their current workload (number of unfinished assigned tasks). Each result includes a workload status label and a recommendation score.

**Why it is useful:** When assigning a new task, a manager can query this endpoint to find the most available qualified person. The traversal crosses three relationship types in one query (skill ownership, task assignment, reporting hierarchy) — this multi-hop pattern is a core strength of graph databases.

---

### Redis

**Role:** In-memory layer that sits in front of MongoDB to reduce database load, store user sessions, rank users by productivity, track activity, and group tasks by tag. Redis was chosen for its sub-millisecond reads and its native support for the data structures needed — each feature maps directly to the optimal Redis type.

**Driver used:** `redis` v4 (node-redis native client — no abstraction layer)

---

#### Data Types Used

| Redis Type | Key Pattern | TTL | Purpose |
|---|---|---|---|
| **String** (JSON) | `task:<id>` | 5 min | Cached task documents — avoids repeated MongoDB reads for hot tasks |
| **String** (JSON) | `dashboard:metrics` | 30 min | Cached aggregation result — the dashboard pipeline is expensive, so the result is cached and reused |
| **String** (JSON) | `session:<id>` | 24 h | User session storage — stores login state without hitting the database on every request |
| **String** (int) | `views:<taskId>` | 24 h | View counter incremented atomically with `INCR` — no read-modify-write race condition |
| **Hash** | `user:<id>` | 10 min | User profile fields stored as a hash — more memory-efficient than a full JSON string when only some fields are needed |
| **List** | `activity:<userId>` | 7 days | Per-user activity feed — `LPUSH` prepends new events; `LRANGE` reads the most recent ones; auto-trimmed to 100 entries with `LTRIM` |
| **Set** | `tag:<name>` | 24 h | Tasks grouped by tag — membership is unique by nature, `SMEMBERS` returns all tasks for a tag instantly |
| **Sorted Set** | `tasks:urgent` | 5 min | Urgent task queue — tasks scored by urgency; `ZRANGE REV` returns the top-N most urgent tasks |
| **Sorted Set** | `leaderboard:users` | 24 h | User productivity leaderboard — `ZINCRBY` increments a user's completed-task count; `ZRANGE REV` returns top-N users |

#### Summary of Redis roles

- **Caching** — Task documents and dashboard metrics are cached to reduce MongoDB load on frequently read data.
- **Session storage** — User sessions are stored in Redis (TTL 24 h) so authentication state is fast to look up.
- **Leaderboard** — The sorted set leaderboard ranks users by tasks completed in real time.
- **Activity feed** — Each user has a Redis list acting as an event log (last 100 actions).
- **Queue / prioritisation** — The urgent task sorted set acts as a priority queue ordered by urgency score.
- **Tag index** — Sets group task IDs by tag, enabling instant tag-based lookups without a MongoDB query.
- **Counters** — Atomic `INCR` tracks task view counts without locking.
# Collaborative Code Editor – Backend  
**MERN-Friendly, Real-Time, Cloud-Ready**

A production-style backend for a real-time collaborative coding workspace, designed to satisfy the **Purple Merit Technologies Backend Developer Assessment** requirements.

This service exposes **REST APIs**, **WebSocket events**, **async job processing**, and runs on **PostgreSQL + MongoDB + Redis**, fully **Dockerized for cloud deployment**.

---

## 1. Architecture Overview

### 🛠 Tech Stack

| Category | Technology |
|---|---|
| Runtime | Node.js (ES Modules), Express |
| Authentication & API | JWT, Redis-backed sessions, RBAC |
| Databases | PostgreSQL (core entities), MongoDB (snapshots/history) |
| Cache / Queue | Redis |
| Realtime Communication | Socket.IO (WebSockets) |
| Background Processing | BullMQ Worker |
| Deployment | Docker + Docker Compose (App + Worker + Postgres + MongoDB + Redis) |

---

### 🔷 Databases

**PostgreSQL (Relational)**
- Users  
- Projects  
- Workspaces  
- Members  
- Job records  

**MongoDB (Non-Relational)**
- Code snapshots  
- Historical file versions  

**Redis**
- JWT Session store using `jti`  
- BullMQ queue backend  
- General caching layer (e.g., project/workspace fetch)  

---

### 📡 High-Level Components

#### 1. **App (Express + Socket.IO)**
- REST APIs under `/api/v1/**`
- WebSocket server for real-time collaboration
- Emits/receives live events:
  - user join/leave workspace
  - code updates
  - cursor movement
  - file sync events

#### 2. **Worker (BullMQ)**
- Listens to Redis queue events
- Simulates code execution jobs asynchronously
- Updates job status/results in PostgreSQL

#### 3. **PostgreSQL**
- Stores strong relational entities:
  - users, roles, permissions
  - projects and workspace relationships
  - job execution logs and task states

#### 4. **MongoDB**
- Keeps workspace code snapshots
- Suitable for dynamic editor documents

#### 5. **Redis**
- Session store for JWT refresh tokens
- Queue backend for worker
- Lightweight response caching

---

## 2. Setup & Run Instructions

### Prerequisites
- Docker Desktop installed and running  
- Node.js 20+ *(only required if running locally without Docker)*  
- Postman/Thunder Client/cURL for API testing  

---

### Environment Configuration

Create a `.env` file in backend root:

```env
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://postgres:password@postgres:5432/workspace_db
MONGO_URI=mongodb://mongo:27017/workspace
REDIS_URL=redis://redis:6379

JWT_SECRET=super-secret-jwt-key-2025
REFRESH_SECRET=super-secret-refresh-key-2025
LOG_LEVEL=info
```

> Hostnames `postgres`, `mongo`, `redis` match Docker Compose services.

---

### Docker-Based Development

From project directory:

```bash
docker compose up --build
```

This launches:

| Service | Description |
|---|---|
| **app** | Express + Socket.IO API server → http://localhost:3000 |
| **worker** | BullMQ Worker |
| **postgres** | PostgreSQL 15 |
| **mongo** | MongoDB 6 |
| **redis** | Redis 7 |

---

### Initial Schema Setup (If not auto-migrated)

```bash
docker cp init.sql pm_postgres:/init.sql
docker exec -it pm_postgres psql -U postgres -d workspace_db -f /init.sql
```

---

### Health & Docs

| Purpose | URL |
|---|---|
| Health Check | `GET http://localhost:3000/health` → `{ "status": "OK" }` |
| Swagger | `http://localhost:3000/api-docs` |

---

## 3. API Design

### 3.1 Authentication & Authorization

**Base URL:** `/api/v1/auth`

---

#### `POST /auth/register`

**Body**
```json
{ "email": "user@example.com", "password": "password123" }
```

Creates user in Postgres with hashed password and unique email.  
**Returns → `201 Created`**

```json
{ "id": 1, "email": "user@example.com" }
```

---

#### `POST /auth/login`

**Body**
```json
{ "email": "user@example.com", "password": "password123" }
```

Flow:
- Validates credentials using `User.verifyPassword`
- Generates:
  - **Access Token (36h)** → `{ jti, userId }`
  - **Refresh Token (7d)** → `{ jti }`
- Stores session in Redis:

```
session:<jti> = { id, email, role }
```

**Returns**
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": { "id": 1, "email": "user@example.com" }
}
```

---

#### `POST /auth/refresh`

**Body**
```json
{ "refreshToken": "..." }
```

Flow:
1. Validates refresh token with `REFRESH_SECRET`
2. Reads `session:<oldJti>` from Redis  
3. Generates new access token + new `jti`  
4. Creates `session:<newJti>` and deletes old session  

**Returns**
```json
{ "accessToken": "new-token" }
```

---


## Middleware

- **authenticate** – verifies access token, loads session from Redis, sets `req.user`
- **requireRole(['owner','collaborator','viewer'])** – RBAC route protection middleware

---

## 3.2 Projects API

**Base URL:** `/api/v1/projects` *(all endpoints require `authenticate`)*

---

### `POST /projects`

**Body**
```json
{ "name": "My Project" }
```

Creates project with `owner_id = req.user.id`  
**Returns → `201 Created` + project object**

---

### `GET /projects?limit=&offset=`

Lists projects owned by authenticated user  
**Returns → `200 OK` + []**

---

### `GET /projects/:id`

- Returns project only if user is owner  
- `403 Forbidden` if not owner  
- `404` if not found  

---

### `PATCH /projects/:id`

**Body**
```json
{ "name": "New Name" }
```

Updates project name if caller is owner

---

### `DELETE /projects/:id`

Deletes project if caller is owner  
**Returns → `204 No Content`**

> Project reads can be cached in Redis using key pattern `project:<id>`

---

## 3.3 Workspaces & Membership

**Base URL:** `/api/v1/workspaces` *(auth required)*

---

### `POST /workspaces`

**Body**
```json
{ "projectId": 1, "name": "Main Workspace" }
```

- Checks project exists and `project.owner_id === req.user.id`
- Creates workspace + adds user as **owner** in `workspace_members`

**Returns → `201 Created` + workspace**

---

### `GET /workspaces/project/:projectId`

Returns all workspaces under the given project

---

### `POST /workspaces/invite`

**Body**
```json
{ "workspaceId": 1, "userId": 2, "role": "collaborator" }
```

- Only **workspace owner** can invite users/assign roles  
- Upserts into `workspace_members`

**Returns → `200 OK`**

---

### `GET /workspaces/:id/members`

Returns list of members with role metadata:
```json
[
  { "id": 1, "email": "owner@mail", "role": "owner" },
  ...
]
```

---

## 3.4 Code Snapshots (Mongo)

**Base URL:** `/api/v1/workspaces/:id/snapshot` *(auth required)*

---

### `POST /workspaces/:id/snapshot`

**Body**
```json
{ "content": "...", "path": "main.js" }
```

- Caller must **not** be `viewer`
- Uses `FileSnapshot` collection
- Inserts new version = lastVersion + 1

**Returns → `201 Created`**
```json
{ "workspaceId": 1, "path": "main.js", "version": 2 }
```

---

### `GET /workspaces/:id/snapshot/latest`

Returns latest snapshot:
```json
{
 "workspaceId": 1,
 "path": "main.js",
 "content": "...",
 "version": 3,
 "updatedAt": "2025-12-28T12:00:00Z"
}
```

> Demonstrates **Postgres for metadata + MongoDB for editor content**

---

## 3.5 Jobs (Async Code Execution Simulation)

**Base URL:** `/api/v1/jobs` *(auth required)*

---

### `POST /jobs`

**Body**
```json
{
  "workspaceId": 1,
  "input": { "code": "console.log('hello');" },
  "idempotencyKey": "job-1"
}
```

Validations:
- Workspace exists
- Role is `owner` or `collaborator`
- **Idempotency supported**
  - If job already exists by idempotencyKey → return existing job (`200`)
  - Else insert job `pending`, enqueue worker execution

**Returns → `202 Accepted` + job row**

---

### `GET /jobs/workspace/:workspaceId?limit=&offset=`

Returns recent jobs with execution status & result payload

## Worker Behavior

**worker.js**

Listens on **code-execution queue (BullMQ + Redis)**

### Execution flow:
1. Fetch job by `idempotency_key` from Postgres  
2. If job already completed → **skip (idempotent)**  
3. Else  
   - mark status → `processing`  
   - simulate execution (sleep 1–3s)  
   - produce `output_json` → `{ stdout, success, executionTime }`  
   - update status → `completed`  

### Retry Policy
- Retries **up to 3 times** (exponential backoff)  
- If final attempt fails → status `failed` with error in `output_json`  

> Satisfies async job processing, retry logic, failure handling & idempotency.

---

## 4. Real-Time Collaboration (WebSockets / Socket.IO)

Socket.IO attached in `server.js`

### Connection URL:
```
ws://localhost:3000
```

### Client → Server Events

| Event | Payload | Server Behavior |
|---|---|---|
| `join-workspace` | `{ workspaceId, userId }` | `socket.join(workspace:<id>)` → emits `user-joined` |
| `file-change` | `{ workspaceId, delta, version }` | emits `content-updated` to room |
| `cursor-update` | `{ workspaceId, position, userId }` | emits `cursor-moved` to room |

### Server → Client Events
- `user-joined`
- `user-left`
- `content-updated`
- `cursor-moved`

> Meets requirement: WebSocket join/leave + file change + cursor broadcast.

---

## 5. Data Model & Storage

### PostgreSQL (relational)

```
users(id, email, password_hash, role, created_at)
projects(id, owner_id, name, created_at)
workspaces(id, project_id, name, created_at)
workspace_members(id, workspace_id, user_id, role)
jobs(id, workspace_id, status, input_json, output_json, idempotency_key, retries, created_at, updated_at)
```

#### Constraints & Indexes
- email unique  
- foreign keys:
  - `projects.owner_id → users.id`
  - `workspaces.project_id → projects.id`
  - `workspace_members.workspace_id → workspaces.id`
  - `jobs.workspace_id → workspaces.id`
- indexes:
  - `idx_projects_owner(owner_id)`
  - `idx_workspaces_project(project_id)`
  - `idx_members_workspace(workspace_id)`
  - `idx_jobs_workspace(workspace_id)`
  - `idx_jobs_status(status)`
  - `idx_jobs_idempotency(idempotency_key)`

---

### MongoDB (document)

**FileSnapshot**
```
{ workspaceId, path, content, version, createdAt, updatedAt }
```

Index → `(workspaceId, version desc)`  
Used for versioned file history

---

### Redis

Key examples:
```
session:<jti> = JWT session (TTL)
project:<id> = cached project response
```

Used for:
- Session store
- BullMQ queue backend
- Optional caching layer

---

## 6. Security, Performance & DevOps

### Security
- JWT auth + refresh token rotation
- Redis session-based jti invalidation
- RBAC: owner/collaborator/viewer
- Joi input validation on modify routes
- Parameterized SQL → injection safe
- Helmet + CORS configured

---

### Performance & Scalability
- Non-blocking async Node.js
- Redis caching for frequent reads
- Socket.IO rooms → efficient broadcasting
- Multi-instance scale supported through Redis
- Worker scaling independent of API layer

---

### Testing (planned execution)
Frameworks: **Jest + Supertest**

Coverage targets:
- Unit tests → controllers/services
- Integration → auth/login/refresh, project CRUD, jobs submission
- Approx. **70% business logic coverage**

---

### Deployment & CI/CD
- Dockerfile builds production image
- Docker Compose → app + worker + postgres + mongo + redis
- CI/CD (e.g. GitHub Actions):
```
npm run lint
npm test
docker build ...
```

---

## 7. Design Decisions & Scalability Considerations

| Choice | Reason |
|---|---|
| PostgreSQL | Strong relational links for projects/workspaces/users |
| MongoDB | Versioned snapshot storage, flexible schema |
| Redis + BullMQ | Async non-blocking processing, scalable workers |
| Socket.IO Rooms | Per-workspace broadcasting |
| Idempotency on Jobs | Prevents duplicate execution |

> Architecture directly addresses assessment focus: API design, multi-DB use, security, caching, WebSockets, async workers, scalable deployment.

---





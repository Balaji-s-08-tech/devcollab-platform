# 🚀 DevCollab — Real-Time Developer Collaboration Platform

A full-stack platform combining **Notion-style docs**, **GitHub-style issue tracking**, **Kanban boards**, and **real-time team collaboration** — built for developer teams.

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite + React JS |
| Backend | Node.js + Express.js |
| Database | MongoDB (Mongoose) |
| Cache / Pub-Sub | Redis (ioredis) |
| Real-time | Socket.io |
| Auth | JWT + bcrypt |
| Transport | HTTPS (self-signed / Let's Encrypt) |

---

## ✨ Features

- 📝 **Rich Document Editor** — Notion-style pages with markdown, embeds, mentions
- 🗂️ **Kanban Boards** — Drag-and-drop task management with real-time updates
- 🐛 **Issue Tracker** — GitHub-style issues with labels, assignees, milestones
- 👥 **Team Management** — Workspaces, roles (Owner / Admin / Dev / Viewer)
- 🔔 **Real-Time Notifications** — Socket.io powered live updates
- 💬 **Inline Comments** — Comment on documents, tasks, issues
- 🔍 **Global Search** — Redis-cached full-text search
- 🔒 **HTTPS** — Secure by default
- 📊 **Activity Feed** — Audit log of all team actions
- 🎨 **Dark / Light Mode**

---

## 📁 Project Structure

```
devcollab/
├── client/               # Vite React frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Route-level pages
│   │   ├── hooks/        # Custom React hooks
│   │   ├── context/      # React context providers
│   │   ├── services/     # API + Socket services
│   │   └── utils/        # Helpers
│   └── vite.config.js
│
├── server/               # Node.js Express backend
│   ├── config/           # DB, Redis, HTTPS config
│   ├── models/           # Mongoose schemas
│   ├── routes/           # Express routers
│   ├── controllers/      # Business logic
│   ├── middleware/       # Auth, cache, rate-limit
│   ├── socket/           # Socket.io event handlers
│   └── server.js         # Entry point
│
├── docker-compose.yml    # MongoDB + Redis + App
└── .env.example
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 6+
- Redis 7+
- OpenSSL (for local HTTPS certs)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/devcollab.git
cd devcollab

# Install server deps
cd server && npm install

# Install client deps
cd ../client && npm install
```

### 2. Environment Setup

```bash
cp .env.example server/.env
# Edit server/.env with your values
```

### 3. Generate HTTPS Certs (dev)

```bash
cd server/certs
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/CN=localhost"
```

### 4. Start with Docker (recommended)

```bash
docker-compose up -d
```

### 5. Start manually

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

### 6. Open

- Frontend: https://localhost:5173
- API: https://localhost:3443

---

## 🔑 API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login + JWT |
| GET | /api/projects | List projects |
| POST | /api/projects | Create project |
| GET | /api/projects/:id/documents | List docs |
| POST | /api/documents | Create document |
| PATCH | /api/documents/:id | Update (real-time) |
| GET | /api/tasks | Get tasks / board |
| POST | /api/tasks | Create task |
| PATCH | /api/tasks/:id | Update task |
| GET | /api/issues | Get issues |
| POST | /api/issues | Create issue |
| GET | /api/teams/:id/members | Get members |
| GET | /api/search?q= | Global search |
| GET | /api/notifications | Get notifications |

---

## 🔌 Socket.io Events

| Event | Direction | Description |
|---|---|---|
| `doc:join` | Client → Server | Join document room |
| `doc:change` | Client → Server | Send doc delta |
| `doc:update` | Server → Client | Broadcast doc changes |
| `task:move` | Client → Server | Move kanban card |
| `task:update` | Server → Client | Broadcast task change |
| `issue:comment` | Client → Server | Add comment |
| `notification:new` | Server → Client | Push notification |
| `user:presence` | Client → Server | Online/typing status |
| `user:presence` | Server → Client | Broadcast presence |

---

## 🐳 Docker Services

```yaml
services:
  app:      # Node.js API (port 3443 HTTPS)
  client:   # Vite preview (port 4173)
  mongo:    # MongoDB (port 27017)
  redis:    # Redis (port 6379)
```

---

## 🧪 Testing

```bash
# Server unit + integration tests
cd server && npm test

# Client component tests
cd client && npm test
```

---

## 📜 License

MIT © DevCollab Team

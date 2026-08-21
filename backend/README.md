# Gaia Backend — Lead Generation API

A production-ready Node.js/Express/MongoDB backend for a solar/energy lead-generation business.

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env and set your MONGO_URI and JWT_SECRET
```

### 3. Seed the first admin user
```bash
npm run seed
```

### 4. Start the server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs at: `http://localhost:5000`

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── db.js               # MongoDB connection
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── users.controller.js
│   │   ├── leads.controller.js
│   │   ├── calls.controller.js
│   │   └── analytics.controller.js
│   ├── middleware/
│   │   ├── auth.js             # JWT authenticate + authorize
│   │   ├── errorHandler.js     # Global error handler
│   │   └── validate.js         # Joi schema validation
│   ├── models/
│   │   ├── User.js
│   │   ├── Lead.js
│   │   └── Call.js
│   ├── routes/
│   │   ├── index.js
│   │   ├── auth.routes.js
│   │   ├── users.routes.js
│   │   ├── leads.routes.js
│   │   ├── calls.routes.js
│   │   └── analytics.routes.js
│   ├── utils/
│   │   ├── logger.js           # Winston logger
│   │   ├── asyncHandler.js
│   │   ├── ApiError.js
│   │   ├── apiResponse.js
│   │   ├── queryHelpers.js     # Pagination + date filter
│   │   └── seed.js             # Admin seeder
│   ├── validators/
│   │   └── schemas.js          # All Joi schemas
│   ├── app.js                  # Express app setup
│   └── server.js               # Entry point
├── .env.example
├── .gitignore
└── package.json
```

---

## 🔐 Authentication

All protected routes require:
```
Authorization: Bearer <token>
```

Tokens are obtained via `POST /api/auth/login`.

| Role  | Capabilities                                              |
|-------|-----------------------------------------------------------|
| admin | Full access: users, all leads/calls, analytics            |
| agent | Own leads (assigned only) and own calls only              |

---

## 📡 API Endpoints

### Auth
| Method | Endpoint         | Auth     | Description        |
|--------|-----------------|----------|--------------------|
| POST   | /api/auth/login | Public   | Login, get JWT     |
| GET    | /api/auth/me    | Any role | Get current user   |

### Users (Admin only)
| Method | Endpoint                    | Description         |
|--------|-----------------------------|---------------------|
| POST   | /api/users                  | Create agent/admin  |
| GET    | /api/users                  | List all users      |
| PATCH  | /api/users/:id/deactivate   | Deactivate a user   |

### Leads
| Method | Endpoint                  | Auth        | Description           |
|--------|--------------------------|-------------|----------------------|
| POST   | /api/leads               | Public      | Submit website form  |
| GET    | /api/leads               | Any role    | List leads (filtered)|
| GET    | /api/leads/:id           | Any role    | Get single lead      |
| PATCH  | /api/leads/:id/assign    | Admin       | Assign to agent      |
| PATCH  | /api/leads/:id/status    | Any role    | Update status        |

### Calls
| Method | Endpoint    | Auth     | Description       |
|--------|------------|----------|-------------------|
| POST   | /api/calls | Any role | Log a call        |
| GET    | /api/calls | Any role | List calls        |

### Analytics (Admin only)
| Method | Endpoint                   | Description               |
|--------|---------------------------|---------------------------|
| GET    | /api/analytics/overview   | Global stats              |
| GET    | /api/analytics/user/:id   | Per-agent stats           |

---

## 🔍 Query Parameters

All list endpoints support:
| Param   | Type   | Description                     |
|---------|--------|---------------------------------|
| page    | number | Page number (default: 1)        |
| limit   | number | Items per page (default: 20)    |
| from    | ISO date | Start date filter             |
| to      | ISO date | End date filter               |
| agent   | ObjectId | Filter by agent (admin only)  |
| status  | string | Lead status filter              |
| source  | string | form or call                    |

---

## 📊 Analytics Response Shape

### `GET /api/analytics/overview`
```json
{
  "totals": { "leads": 142, "calls": 89, "activeUsers": 5 },
  "leadsByStatus": { "new": 40, "contacted": 60, "converted": 30, "lost": 12 },
  "callsByStatus": { "answered": 60, "missed": 15, "no_answer": 14 },
  "leadsBySource": { "form": 100, "call": 42 },
  "dailyLeads": [{ "_id": "2024-06-01", "count": 8 }],
  "dailyCalls":  [{ "_id": "2024-06-01", "count": 5, "totalDuration": 1240 }]
}
```

---

## 🗄️ MongoDB Indexes

The following indexes are created automatically by Mongoose:

**User:** `username` (unique)

**Lead:** `email`, `source`, `assignedTo`, `status`, `createdAt`, compound: `(assignedTo, status)`, `(assignedTo, createdAt)`

**Call:** `agent`, `status`, `createdAt`, compound: `(agent, createdAt)`

---

## 🛡️ Security Features
- Passwords hashed with `bcryptjs` (12 salt rounds)
- JWT authentication with configurable expiry
- `helmet` for HTTP security headers
- `cors` with configurable origin
- Rate limiting: 200 req/15min global, 10 req/15min on login
- Input validation on all endpoints via Joi
- No public signup — admins create all accounts
- Agents are strictly scoped to their own data

---

## 📬 Postman Collection

Import `Gaia.postman_collection.json` into Postman.

**Workflow:**
1. Run **Login (Admin)** → token is auto-saved
2. Run **Create Agent** → agentId is auto-saved
3. Run **Submit Lead (Public)** → leadId is auto-saved
4. Run **Assign Lead** → assigns to the created agent
5. Run analytics endpoints to see live data

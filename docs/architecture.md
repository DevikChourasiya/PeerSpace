# PeerSpace — Architecture Documentation

## 1. Overview & Vision

**PeerSpace — Student Feedback Management System** is a production-minded web application designed for higher education and collaborative environments. It provides structured peer evaluation, anonymous qualitative feedback, and longitudinal academic growth tracking.

This document describes the architectural foundation, structural conventions, and operational patterns established across Stage 1 and Stage 2.

---

## 2. Monorepo Organization

PeerSpace is structured as an npm workspaces monorepo with strict package boundaries:

```
PeerSpace/
├── apps/
│   ├── api/                  # Express REST API service (Node.js, TypeScript)
│   └── web/                  # Web Client (React 18, Vite, Tailwind CSS)
├── packages/
│   └── shared/               # Shared contracts, Zod schemas, domain types
├── docs/                     # Architectural, operational, and setup guides
├── .env.example              # Environment variable template
├── tsconfig.base.json        # Shared TypeScript compiler configuration
└── package.json              # Monorepo workspace configuration
```

### Dependency Rules:

1. `packages/shared` must remain environment-agnostic (no Express, DOM, or database drivers).
2. `apps/api` and `apps/web` depend on `@peerspace/shared` for validation schemas and shared domain contracts.
3. Neither application may directly import internal implementation details from the other.

---

## 3. Technology Stack & Rationale

| Layer              | Technology                     | Key Capabilities & Rationale                                                            |
| ------------------ | ------------------------------ | --------------------------------------------------------------------------------------- |
| **Monorepo**       | npm Workspaces                 | Native, zero-overhead dependency linking without third-party orchestrators              |
| **Backend**        | Express + Node.js (TypeScript) | Proven REST server with custom middleware pipeline and structured error boundaries      |
| **Database**       | MongoDB + Mongoose             | Schema-driven document persistence with connection lifecycle pooling                    |
| **Authentication** | `connect-mongo` + `bcryptjs`   | MongoDB-backed server-side sessions, salted password hashing, brute-force rate limiting |
| **Validation**     | Zod                            | Runtime type validation for environment variables, API payloads, and query params       |
| **Frontend**       | React 18 + Vite                | Lightning-fast HMR, ES module bundling, optimized production builds                     |
| **Styling**        | Tailwind CSS + Lucide          | Utility-first responsive design system with dark mode aesthetics                        |
| **Client State**   | TanStack Query v5              | Server-state caching, automatic revalidation, query deduplication, error retry control  |
| **Forms**          | React Hook Form + Zod          | Performant, uncontrolled form state with automatic validation resolution                |
| **Testing**        | Vitest + Supertest + RTL       | Fast ESM-native test runner with unified developer experience across web and API        |

---

## 4. Authentication & Role-Based Access Control (`apps/api`)

### 4.1 User Domain Model

The `User` schema stores credentials and authorization state:

- `name`: string (2-100 chars, trimmed)
- `email`: unique normalized lowercase string (indexed)
- `passwordHash`: bcrypt hash with salt work factor 10 (`select: false` by default)
- `role`: enum (`student`, `peer_reviewer`, `instructor`, `admin`), defaults to `student`
- `status`: enum (`pending`, `active`, `suspended`), defaults to `pending`

### 4.2 Security Constraints

- **Self-Approval Prevention**: Public registration hardcodes `role: 'student'` and `status: 'pending'`. Any user attempting to send `admin` or `active` in the registration payload is rejected or strictly overridden.
- **Session Security**: Server-side sessions are managed via `express-session` with `MongoStore` persisting to the `sessions` collection in MongoDB. Cookies are marked `httpOnly`, `sameSite: 'lax'`, and `secure` in production.
- **Session Fixation Defense**: Sessions are explicitly regenerated upon login before user details are bound.
- **Brute Force Protection**: Registration and login endpoints are wrapped with `express-rate-limit`.

### 4.3 Authorization Middlewares

1. `requireAuth`: Validates `req.session.userId`, verifies user existence in MongoDB, and attaches `req.user`.
2. `requireRole(...allowedRoles)`: Verifies that the authenticated user possesses the required role.
3. `requireApprovedMembership`: Ensures the user has `status: 'active'`, returning `403 MEMBERSHIP_PENDING` if their registration has not yet been approved.

---

## 5. Backend Architecture & Health

### 5.1 Application Initialization & Lifecycle

The server is started via `src/index.ts`:

1. **Environment Validation**: `src/config/env.ts` parses and validates all required runtime variables using Zod before server boots. If invalid, the process aborts with actionable errors.
2. **Database Initialization**: `connectDatabase()` connects to MongoDB using Mongoose. If MongoDB is temporarily unreachable, the server starts in **degraded mode** rather than crashing outright.
3. **Graceful Shutdown**: Listens for `SIGTERM` and `SIGINT`. Upon signal receipt:
   - Closes the HTTP server to halt incoming connections.
   - Disconnects Mongoose connection cleanly.
   - Implements a 10-second fail-safe timeout.

### 5.2 Health & Diagnostics Endpoint (`/api/health`)

The endpoint delivers structured diagnostics conforming to `HealthResponseSchema`:

- Service status: `ok` (if DB connected) or `degraded` (if DB disconnected).
- HTTP Status: `200` for healthy, `503` for degraded.
- Database details: connection state (`connected`/`disconnected`), database name, host, and live latency in milliseconds measured via `db.admin().ping()`.
- Process metrics: uptime in seconds, Node memory usage (RSS, heap total, heap used).

### 5.3 Standard Error Format

All error responses adhere to a consistent JSON envelope:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found: GET /api/xyz",
    "details": null
  },
  "meta": {
    "timestamp": "2026-10-20T00:00:00.000Z"
  }
}
```

---

## 6. Frontend Architecture (`apps/web`)

### 6.1 Real-Time Diagnostics

- `HealthMonitor` uses TanStack Query (`useQuery`) with a 15-second polling interval and automatic retry configuration.
- Vite dev server proxies `/api` requests to `http://localhost:5001`, avoiding CORS issues during local development.

### 6.2 Component & Style System

- Tailwind CSS configured with a tailored dark mode palette and system font stack.
- Utility helper `cn()` merging `clsx` and `tailwind-merge` prevents style conflicts.

---

## 7. Testing Strategy

- **Backend**: Supertest exercises Express route handlers and middleware pipelines in Vitest (`auth.test.ts`, `health.test.ts`).
- **Frontend**: React Testing Library and Vitest in JSDOM environment render components and assert user-visible states.
- **Shared**: Type checking via `tsc --noEmit` validates all shared schemas and contracts.

---

## 8. Roadmap & Subsequent Stages

1. **Stage 1 (Completed)**: Foundation, monorepo, environment validation, Mongoose lifecycle, health monitoring, test harness.
2. **Stage 2 (Completed)**: Secure authentication (server-side sessions with `connect-mongo`, `bcryptjs`, registration, duplicate handling, pending membership, RBAC).
3. **Stage 3**: Course & group membership approval workflows.
4. **Stage 4**: Peer feedback rounds, rubric criteria, and evaluation submissions.
5. **Stage 5**: Anonymous feedback mode, flagging, and moderation.
6. **Stage 6**: Student growth analytics, rubric dashboards, and AI assistant integration.

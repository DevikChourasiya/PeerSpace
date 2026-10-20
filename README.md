# PeerSpace — Student Feedback Management System

[![Monorepo](https://img.shields.io/badge/monorepo-npm%20workspaces-blue.svg)](#monorepo-structure)
[![Backend](https://img.shields.io/badge/backend-Express%20%7C%20TypeScript-lightgrey.svg)](apps/api)
[![Frontend](https://img.shields.io/badge/frontend-React%2018%20%7C%20Vite%20%7C%20Tailwind-teal.svg)](apps/web)
[![Database](https://img.shields.io/badge/database-MongoDB%20%7C%20Mongoose-green.svg)](#database-configuration)
[![Stage](https://img.shields.io/badge/stage-Stage%202%20Auth%20%26%20RBAC-emerald.svg)](#authentication--rbac)

PeerSpace — Student Feedback Management System is a production-minded web application designed for higher education and collaborative environments. It provides structured peer evaluation, anonymous qualitative feedback, and longitudinal academic growth tracking.

---

## Architecture & Monorepo Structure

PeerSpace is configured as a type-safe npm workspaces monorepo:

```
PeerSpace/
├── apps/
│   ├── api/                  # Express REST backend with Mongoose & Zod env validation
│   └── web/                  # React 18 frontend with Vite, Tailwind CSS, TanStack Query
├── packages/
│   └── shared/               # Shared TypeScript domain types and Zod validation schemas
├── docs/
│   ├── architecture.md       # Technical design, design patterns, and roadmap
│   └── setup.md              # Detailed local environment setup and prerequisites
├── .env.example              # Environment variables template (placeholders only)
├── tsconfig.base.json        # Shared root TypeScript compiler configuration
└── package.json              # Monorepo workspaces and orchestration scripts
```

---

## Technology Stack

- **Monorepo**: npm workspaces
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Data Fetching & State**: TanStack Query v5
- **Forms & Validation**: React Hook Form, Zod
- **Backend**: Node.js, Express, TypeScript, Helmet, Morgan, CORS, express-rate-limit
- **Authentication**: Server-side sessions with `connect-mongo`, `express-session`, and `bcryptjs` password hashing
- **Database**: MongoDB Community Server, Mongoose 8
- **Testing**: Vitest, React Testing Library, Supertest

---

## Getting Started

### 1. Prerequisites

- Node.js `v20+` (tested on Node `v24`)
- npm `v10+` (tested on npm `v11`)
- MongoDB Community Server running locally on port `27017`

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

The local development defaults in `.env.example` point to:

```
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/peerspace_feedback
CORS_ORIGIN=http://localhost:5173
SESSION_SECRET=dev-session-secret-peerspace-development-only-32chars
VITE_API_URL=http://localhost:5001
```

> **Security Note**: Never commit `.env` to source control. The `.gitignore` file enforces this rule.

### 3. Install Dependencies & Build Shared Packages

```bash
npm install
npm run build:shared
```

### 4. Database Verification

To verify that MongoDB is running locally before starting the server:

```bash
mongosh --eval "db.runCommand({ ping: 1 })" mongodb://127.0.0.1:27017/peerspace_feedback
```

If MongoDB is not running, start the service (e.g., `brew services start mongodb-community` on macOS).

---

## Development Scripts

Run the following commands from the project root:

| Command                | Description                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `npm run dev`          | Runs both API (`http://localhost:5001`) and Web (`http://localhost:5173`) concurrently |
| `npm run dev:api`      | Starts the Express backend in development watch mode with `tsx`                        |
| `npm run dev:web`      | Starts the Vite React frontend with HMR and API proxy                                  |
| `npm run build`        | Builds `@peerspace/shared`, `@peerspace/api`, and `@peerspace/web` in sequence         |
| `npm run test`         | Executes all test suites across workspaces using Vitest                                |
| `npm run test:api`     | Runs Supertest integration and unit tests for the backend                              |
| `npm run test:web`     | Runs React Testing Library component tests for the frontend                            |
| `npm run typecheck`    | Validates TypeScript types across all workspaces with `tsc --noEmit`                   |
| `npm run format:check` | Checks code formatting across the repository with Prettier                             |
| `npm run format`       | Applies Prettier formatting fixes                                                      |

---

## Authentication & Role-Based Access Control (Stage 2)

### Endpoints

| Method | Endpoint                    | Access                | Description                                                       |
| ------ | --------------------------- | --------------------- | ----------------------------------------------------------------- |
| `POST` | `/api/auth/register`        | Public (Rate-limited) | Register student account (`pending` membership by default)        |
| `POST` | `/api/auth/login`           | Public (Rate-limited) | Authenticate user, regenerate session, set `peerspace.sid` cookie |
| `POST` | `/api/auth/logout`          | Authenticated         | Destroy session and clear session cookie                          |
| `GET`  | `/api/auth/me`              | Authenticated         | Fetch current user session details                                |
| `GET`  | `/api/auth/membership-test` | Approved Member       | Access restricted to `active` accounts                            |
| `GET`  | `/api/auth/instructor-test` | Instructor / Admin    | Access restricted to instructor or admin roles                    |
| `GET`  | `/api/auth/admin-test`      | Admin Only            | Access restricted to administrators                               |

### Security Guarantees

1. **Pending Membership by Default**: Public registration automatically assigns `role: student` and `status: pending`. Attempts to submit elevated privileges (e.g., `admin` role or `active` status) are strictly overridden.
2. **Password Hashing**: Passwords are encrypted using `bcryptjs` with salt rounds = 10. The `passwordHash` field is marked `select: false` on the User model and never leaked.
3. **Session Management**: Sessions are stored server-side in MongoDB (`connect-mongo` in `sessions` collection) with `httpOnly`, `sameSite`, and environment-dependent `secure` cookie flags. Session regeneration on login prevents session fixation.
4. **Brute Force Protection**: Public authentication endpoints are protected by `express-rate-limit`.

---

## Administrator Management & Audit Logging (Stages 4 & 6)

### Endpoints

| Method | Endpoint                       | Access     | Description                                                     |
| ------ | ------------------------------ | ---------- | --------------------------------------------------------------- |
| `GET`  | `/api/admin/users/pending`     | Admin Only | List students awaiting membership approval                      |
| `POST` | `/api/admin/users/:id/approve` | Admin Only | Approve pending student account (creates audit event)           |
| `POST` | `/api/admin/users/:id/reject`  | Admin Only | Reject pending student account (creates audit event)            |
| `POST` | `/api/admin/users/:id/suspend` | Admin Only | Suspend active student account (creates audit event)            |
| `POST` | `/api/admin/users/:id/restore` | Admin Only | Restore suspended student account (creates audit event)         |
| `GET`  | `/api/admin/audit-logs`        | Admin Only | Paginated audit trail with filtering by action, actor, & entity |

### Audit Logging Characteristics

- **Actor Attribution**: Stores `actorId`, `actorEmail`, and `actorRole` for every administrative action.
- **Credential Protection**: Redacts passwords, tokens, hashes, and session cookies from stored change details.
- **Tamper Evidence**: Immutable audit log collections indexed by `createdAt` and `action`.

---

## Questionnaires, Rounds & Student Directory (Stage 5)

### Endpoints

| Method  | Endpoint                                        | Access          | Description                                               |
| ------- | ----------------------------------------------- | --------------- | --------------------------------------------------------- |
| `GET`   | `/api/directory/students`                       | Approved Member | Searchable student cohort directory                       |
| `GET`   | `/api/admin/questionnaires`                     | Admin / Inst    | List questionnaire templates                              |
| `POST`  | `/api/admin/questionnaires`                     | Admin / Inst    | Create new questionnaire rubric                           |
| `POST`  | `/api/admin/questionnaires/:id/versions`        | Admin / Inst    | Publish immutable version of questionnaire                |
| `GET`   | `/api/admin/questionnaires/:id/versions/:verId` | Approved Member | Retrieve frozen questionnaire version                     |
| `GET`   | `/api/rounds`                                   | Approved Member | List feedback rounds (filtered to student cohort)         |
| `POST`  | `/api/admin/rounds`                             | Admin Only      | Create evaluation round with publication version guard    |
| `PATCH` | `/api/admin/rounds/:id/status`                  | Admin Only      | Transition round status (`draft`->`scheduled`->`open`...) |

---

## Feedback Submissions & Student Analytics (Stage 6)

### Endpoints

| Method | Endpoint                                   | Access          | Description                                                |
| ------ | ------------------------------------------ | --------------- | ---------------------------------------------------------- |
| `GET`  | `/api/rounds/:id/peers`                    | Approved Member | List eligible cohort peer candidates available to evaluate |
| `GET`  | `/api/rounds/:id/submissions/peer/:peerId` | Approved Member | Retrieve active draft or submission for a peer             |
| `POST` | `/api/rounds/:id/submissions/draft`        | Approved Member | Save draft evaluation without final rubric validation      |
| `POST` | `/api/rounds/:id/submissions`              | Approved Member | Submit final evaluation with full rubric validation        |
| `PUT`  | `/api/rounds/:id/submissions/:subId`       | Approved Member | Edit existing evaluation before round deadline             |
| `GET`  | `/api/feedback/received`                   | Approved Member | Retrieve received feedback with anonymity rules applied    |
| `GET`  | `/api/feedback/analytics`                  | Approved Member | Fetch aggregated score distribution & competency metrics   |

### Background Round Activation Service

- **Automatic Lifecycle Transitions**: Checks every 30 seconds for `scheduled` rounds whose `startDate` has arrived.
- **Publication Guard**: Verifies that the round is assigned a published `questionnaireVersionId` before opening.
- **Safe Concurrency**: Atomic find-and-modify queries prevent duplicate activations or race conditions.
- **Server Lifecycle Integration**: Starts on API startup and cleanly stops (`clearInterval()`) on shutdown.

---

## Backend Health Endpoint

The API provides a health and diagnostics check at:

```
GET /api/health
```

### Example Response (`200 OK`)

```json
{
  "status": "ok",
  "service": "PeerSpace API",
  "version": "0.1.0",
  "environment": "development",
  "uptime": 124,
  "timestamp": "2026-10-20T00:00:00.000Z",
  "database": {
    "status": "connected",
    "name": "peerspace_feedback",
    "host": "127.0.0.1",
    "latencyMs": 2
  },
  "memory": {
    "rssMb": 48.25,
    "heapUsedMb": 22.14,
    "heapTotalMb": 34.5
  }
}
```

If the database is unreachable, the API returns `503 Degraded` with `database.status: "disconnected"` and an error message, allowing the server to operate in degraded mode without crashing.

---

## Testing & Quality Assurance

Run the complete test suite (99 automated tests across API and Web):

```bash
npm run test
```

Or run packages individually:

```bash
npm run test:api   # 72 Supertest API & database integration tests
npm run test:web   # 27 React Testing Library frontend tests
```

Run TypeScript compilation check:

```bash
npm run typecheck
```

Run code style check:

```bash
npm run format:check
```

---

## Safety & Security Guidelines

- **No Secrets in Code**: Secrets and environment variables are strictly loaded through Zod-validated configuration.
- **Graceful Lifecycle**: The server cleanly handles `SIGTERM` and `SIGINT`, shutting down the HTTP listener and closing Mongoose connections safely.
- **Database Non-Destruction**: The application does not run dropping or destructive commands against existing databases.

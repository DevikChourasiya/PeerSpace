# PeerSpace — Student Feedback & Growth Platform

[![Monorepo](https://img.shields.io/badge/monorepo-npm%20workspaces-blue.svg)](#monorepo-structure)
[![Backend](https://img.shields.io/badge/backend-Express%20%7C%20TypeScript-lightgrey.svg)](apps/api)
[![Frontend](https://img.shields.io/badge/frontend-React%2018%20%7C%20Vite%20%7C%20Tailwind-teal.svg)](apps/web)
[![Database](https://img.shields.io/badge/database-MongoDB%20%7C%20Mongoose-green.svg)](#database-configuration)

PeerSpace is a production-minded web application designed for higher education and collaborative environments. It provides structured peer evaluation, anonymous qualitative feedback, and longitudinal academic growth tracking.

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
- **Backend**: Node.js, Express, TypeScript, Helmet, Morgan, CORS
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

Run the complete test suite:

```bash
npm run test
```

Run TypeScript compilation check:

```bash
npm run typecheck
```

---

## Safety & Security Guidelines

- **No Secrets in Code**: Secrets and environment variables are strictly loaded through Zod-validated configuration.
- **Graceful Lifecycle**: The server cleanly handles `SIGTERM` and `SIGINT`, shutting down the HTTP listener and closing Mongoose connections safely.
- **Database Non-Destruction**: The application does not run dropping or destructive commands against existing databases.

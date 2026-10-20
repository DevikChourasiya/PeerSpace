# PeerSpace — Development Setup Guide

## 1. Prerequisites

- **Node.js**: v20+ (tested on Node v24)
- **npm**: v10+ (tested on npm v11)
- **MongoDB**: MongoDB Community Server 7.x or 8.x running locally on port 27017

---

## 2. MongoDB Setup & Verification

PeerSpace defaults to:

```
mongodb://127.0.0.1:27017/peerspace_feedback
```

### Checking MongoDB Status

Run the following in your terminal to check if MongoDB is active:

```bash
mongosh --eval "db.runCommand({ ping: 1 })" mongodb://127.0.0.1:27017/peerspace_feedback
```

If active, it returns `{ ok: 1 }`.

### Starting MongoDB (if not running)

- **macOS (Homebrew)**:
  ```bash
  brew services start mongodb-community
  ```
- **Linux (systemd)**:
  ```bash
  sudo systemctl start mongod
  ```
- **Docker (Alternative)**:
  ```bash
  docker run -d --name peerspace-mongo -p 27017:27017 mongo:latest
  ```

---

## 3. Installation Steps

1. **Clone and enter the repository**:

   ```bash
   cd PeerSpace
   ```

2. **Copy the environment configuration**:

   ```bash
   cp .env.example .env
   ```

   Inspect `.env` to verify values. The defaults work out of the box for local development.

3. **Install dependencies**:

   ```bash
   npm install
   ```

4. **Build the shared package**:
   ```bash
   npm run build:shared
   ```

---

## 4. Running Development Servers

### Option A: Run Both Backend & Frontend Simultaneously

```bash
npm run dev
```

This boots:

- Express API server on `http://localhost:5001`
- React/Vite development server on `http://localhost:5173`

### Option B: Run Services Individually

- **API Server only**:
  ```bash
  npm run dev:api
  ```
- **Web Client only**:
  ```bash
  npm run dev:web
  ```

---

## 5. Automated Testing & Verification

- **Run all automated tests across workspaces**:
  ```bash
  npm run test
  ```
- **Run API tests only**:
  ```bash
  npm run test:api
  ```
- **Run Web tests only**:
  ```bash
  npm run test:web
  ```
- **Run TypeScript compilation check**:
  ```bash
  npm run typecheck
  ```
- **Verify code formatting**:
  ```bash
  npm run format:check
  ```

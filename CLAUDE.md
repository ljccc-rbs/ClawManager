# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ClawManager is a Kubernetes-first control plane for managing OpenClaw and Linux desktop runtimes. It provides virtual desktop instance management, user quota enforcement, AI Gateway governance, and secure browser-based desktop access.

## Architecture

Monorepo with two main components:

- **frontend/** — React 19 + TypeScript SPA (Vite, TailwindCSS, Zustand, TanStack React Query)
- **backend/** — Go REST API (Gin framework, upper/db v4 ORM, MySQL 8.0+)

The backend module name is `clawreef`. Entry point is `backend/cmd/server/main.go`.

**Backend layers follow:** handlers → services → repository → models, with a separate `services/k8s/` package wrapping the Kubernetes client. The AI Gateway reverse proxy lives in `internal/aigateway/`.

**Frontend state:** Zustand stores for local state, React Query for server state. Routing in `frontend/src/router/index.tsx` with `ProtectedRoute`/`AdminRoute` guards. Internationalization via `contexts/I18nContext` supporting en/zh/ja/ko/de.

**Request flow:** Browser → Frontend (port 9002 dev) → Vite proxy `/api` → Backend (port 9001) → MySQL + Kubernetes API. Desktop access is proxied through the backend, not exposed directly.

## Common Commands

### Frontend (from `frontend/`)
```
npm run dev          # Dev server on port 9002
npm run build        # TypeScript check + Vite build
npm run lint         # ESLint
```

### Backend (from `backend/`)
```
make run             # go run cmd/server/main.go
make build           # go build -o bin/server cmd/server/main.go
make test            # go test -v ./...
make lint            # golangci-lint run
make fmt             # go fmt ./...
make deps            # go mod download && go mod tidy
make migrate         # Run SQL migrations against local MySQL
make docker-up       # Start MySQL via docker-compose
make docker-down     # Stop docker-compose services
```

### Full Stack via Docker
```
docker build -t clawreef:latest -f deployments/docker/Dockerfile .
```

## Key Configuration

- Backend config: `backend/configs/dev.yaml` (DB, JWT, K8s settings)
- Frontend proxy target: `frontend/vite.config.ts` (proxies `/api` to backend)
- K8s deployment manifest: `deployments/k8s/clawmanager.yaml`
- Docker compose (dev MySQL): `deployments/docker/docker-compose.yml`
- Env vars: `SERVER_ADDRESS`, `SERVER_MODE`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`

## CI/CD

GitHub Actions in `.github/workflows/`:
- **build.yml** — On push/PR: builds frontend (Node 20), backend (Go 1.26), Docker image, and runs K8s smoke test with Kind
- **release.yml** — Daily or on tag push: publishes to `ghcr.io/yuan-lab-llm/clawmanager`

## Database

MySQL 8.0+. Migrations are plain SQL files in `backend/internal/db/migrations/`. Auto-migration runs on startup via `internal/db/migrations.go`. Default admin credentials: `admin` / `admin123`.

# Cloud Web Terminal

Production-oriented cloud terminal platform inspired by Google Cloud Shell.

## What is implemented

- React + xterm.js full-screen terminal UI with dark theme, responsive layout, tabbed terminals, resize handling, and copy/paste shortcuts.
- WebSocket terminal transport for real-time command execution and streaming output.
- Node.js + Express backend with `node-pty` shell bridge.
- Docker container isolation per terminal with security controls:
  - CPU / memory / pids limits
  - no-new-privileges
  - cap-drop ALL
  - read-only root filesystem
  - isolated `/workspace` bind mount
  - disabled container networking
- Per-user session tokens (`POST /api/session`) and per-user workspace isolation under `/workspace/sessions/<userId>`.
- Auto cleanup of stale auth sessions and disconnected terminals.
- File manager APIs and frontend support (list/upload/download) scoped to user workspace.
- VS Code web redirect endpoint (`/api/editor`).
- Starter infrastructure with Docker Compose + Kubernetes deployment/HPA.

## Architecture

```text
Browser (React + xterm.js)
  -> WebSocket Gateway (/terminal)
  -> Terminal Session Manager
  -> Docker Container per terminal
  -> bash/zsh shell via node-pty
```

## Run locally

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080`
- Health: `http://localhost:8080/health`

## Build terminal runtime image

```bash
docker build -f Dockerfile.user -t cloudterminal-user .
```

## Compose deployment

```bash
docker compose up --build
```

## Key environment variables

- `TERMINAL_IMAGE` (default: `cloudterminal-user`)
- `CONTAINER_CPU_LIMIT` (default: `1`)
- `CONTAINER_MEMORY_LIMIT` (default: `512m`)
- `SESSION_TTL_MS` (default: `1800000`)
- `AUTH_SESSION_MAX_AGE_MS` (default: `43200000`)
- `WORKSPACES_ROOT` (default: `/workspace/sessions`)

## Notes

- Backend requires Docker socket access to create per-terminal containers.
- For enterprise multi-tenant deployments, move container execution to dedicated sandbox worker nodes (Kata/gVisor/Firecracker) and add centralized auth + persistent DB.

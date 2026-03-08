# Cloud Web Terminal

A full-stack cloud terminal platform inspired by Google Cloud Shell.

## Features

- React + xterm.js full-screen terminal with dark theme, mobile responsive layout, copy/paste, and resizing.
- Multi-terminal tab support (bash + zsh), theme selection, and terminal history replay.
- Node.js + node-pty backend streaming shell IO in real time over WebSockets.
- User-isolated Docker container session per terminal tab.
- Session TTL cleanup for disconnected terminals.
- File manager sidebar with list, upload, and download.
- VS Code web shortcut integration.
- Security hardening: read-only containers, no network, no-new-privileges, CPU/memory/pids limits.
- Infrastructure starter: Docker Compose + Kubernetes deployment/HPA.

## Architecture

1. Frontend opens a WebSocket per tab to `/terminal?tabId=...&shell=bash|zsh`.
2. Backend creates a dedicated Docker container (`docker run ... sleep infinity`) for the session.
3. `node-pty` attaches to `docker exec -it <container> <shell>`.
4. IO events are streamed to clients over WebSocket.
5. On inactivity + disconnect, sessions are destroyed and containers are removed.

## Local development

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend health: http://localhost:8080/health

## Production container flow

Build runtime user image:

```bash
docker build -f Dockerfile.user -t cloudterminal-user .
```

Run stack:

```bash
docker compose up --build
```

## Security knobs

Set in backend environment:

- `CONTAINER_CPU_LIMIT` (default `1`)
- `CONTAINER_MEMORY_LIMIT` (default `512m`)
- `SESSION_TTL_MS` (default `1800000`)
- `TERMINAL_IMAGE` (default `cloudterminal-user`)

## Notes

- Backend needs Docker daemon access (`/var/run/docker.sock`) to spawn per-user containers.
- For stronger isolation in multi-tenant production, replace local Docker with remote sandbox workers (Kata/firecracker/gVisor).

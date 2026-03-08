import os from 'node:os';
import pty from 'node-pty';
import { spawn } from 'node:child_process';

const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS ?? 1000 * 60 * 30);
const CPU_LIMIT = process.env.CONTAINER_CPU_LIMIT ?? '1';
const MEMORY_LIMIT = process.env.CONTAINER_MEMORY_LIMIT ?? '512m';
const IMAGE = process.env.TERMINAL_IMAGE ?? 'cloudterminal-user';

const sessions = new Map();

function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `${command} exited with ${code}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

async function ensureContainer(sessionId) {
  const containerName = `terminal-${sessionId}`;
  await runCommand('docker', [
    'run',
    '--detach',
    '--name',
    containerName,
    '--cpus',
    CPU_LIMIT,
    '--memory',
    MEMORY_LIMIT,
    '--pids-limit',
    '256',
    '--read-only',
    '--tmpfs',
    '/tmp',
    '--tmpfs',
    '/workspace',
    '--network',
    'none',
    '--security-opt',
    'no-new-privileges',
    IMAGE,
    'sleep',
    'infinity'
  ]);
  return containerName;
}

export async function createOrGetSession(sessionId, shell) {
  let session = sessions.get(sessionId);
  if (session) {
    session.expiresAt = Date.now() + SESSION_TTL_MS;
    return session;
  }

  const safeShell = shell === 'zsh' ? 'zsh' : 'bash';
  const containerName = await ensureContainer(sessionId);
  const ptyProcess = pty.spawn('docker', ['exec', '-it', containerName, safeShell], {
    name: 'xterm-color',
    cols: 120,
    rows: 30,
    cwd: os.homedir(),
    env: process.env
  });

  session = {
    id: sessionId,
    shell: safeShell,
    containerName,
    ptyProcess,
    history: [],
    sockets: new Set(),
    expiresAt: Date.now() + SESSION_TTL_MS
  };

  ptyProcess.onData((data) => {
    session.history.push(data);
    if (session.history.length > 1000) {
      session.history.shift();
    }
    session.sockets.forEach((socket) => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify({ type: 'output', data }));
      }
    });
  });

  sessions.set(sessionId, session);
  return session;
}

export function registerSocket(session, socket) {
  session.sockets.add(socket);
  socket.send(JSON.stringify({ type: 'history', data: session.history }));
  session.expiresAt = Date.now() + SESSION_TTL_MS;
}

export function resizeSession(session, cols, rows) {
  session.ptyProcess.resize(cols, rows);
  session.expiresAt = Date.now() + SESSION_TTL_MS;
}

export function writeInput(session, data) {
  session.ptyProcess.write(data);
  session.expiresAt = Date.now() + SESSION_TTL_MS;
}

export function removeSocket(session, socket) {
  session.sockets.delete(socket);
  if (!session.sockets.size) {
    session.expiresAt = Date.now() + SESSION_TTL_MS;
  }
}

export async function destroySession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }

  session.ptyProcess.kill();
  try {
    await runCommand('docker', ['rm', '-f', session.containerName]);
  } catch {
    // ignore missing containers
  }
  sessions.delete(sessionId);
}

export function getSessions() {
  return sessions;
}

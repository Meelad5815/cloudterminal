import fs from 'node:fs/promises';
import path from 'node:path';
import pty from 'node-pty';
import { spawn } from 'node:child_process';

const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS ?? 1000 * 60 * 30);
const CPU_LIMIT = process.env.CONTAINER_CPU_LIMIT ?? '1';
const MEMORY_LIMIT = process.env.CONTAINER_MEMORY_LIMIT ?? '512m';
const IMAGE = process.env.TERMINAL_IMAGE ?? 'cloudterminal-user';
const WORKSPACES_ROOT = process.env.WORKSPACES_ROOT ?? '/workspace/sessions';

const terminals = new Map();

function safeId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

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

async function ensureWorkspace(userId) {
  const workspace = path.join(WORKSPACES_ROOT, safeId(userId));
  await fs.mkdir(workspace, { recursive: true });
  return workspace;
}

async function ensureContainer(userId, terminalId, workspacePath) {
  const containerName = `terminal-${safeId(userId)}-${safeId(terminalId)}`;
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
    '--security-opt',
    'no-new-privileges',
    '--cap-drop',
    'ALL',
    '--read-only',
    '--tmpfs',
    '/tmp',
    '--mount',
    `type=bind,src=${workspacePath},dst=/workspace`,
    '--network',
    'none',
    IMAGE,
    'sleep',
    'infinity'
  ]);
  return containerName;
}

export async function createOrGetTerminal(userId, terminalId, shell) {
  const key = `${safeId(userId)}:${safeId(terminalId)}`;
  let terminal = terminals.get(key);
  if (terminal) {
    terminal.expiresAt = Date.now() + SESSION_TTL_MS;
    return terminal;
  }

  const safeShell = shell === 'zsh' ? 'zsh' : 'bash';
  const workspacePath = await ensureWorkspace(userId);
  const containerName = await ensureContainer(userId, terminalId, workspacePath);
  const ptyProcess = pty.spawn('docker', ['exec', '-it', containerName, safeShell], {
    name: 'xterm-color',
    cols: 120,
    rows: 30,
    cwd: workspacePath,
    env: process.env
  });

  terminal = {
    key,
    userId: safeId(userId),
    terminalId: safeId(terminalId),
    shell: safeShell,
    workspacePath,
    containerName,
    ptyProcess,
    history: [],
    sockets: new Set(),
    expiresAt: Date.now() + SESSION_TTL_MS
  };

  ptyProcess.onData(async (data) => {
    terminal.history.push(data);
    if (terminal.history.length > 2000) {
      terminal.history.shift();
    }
    const historyFile = path.join(workspacePath, `.terminal-${terminal.terminalId}.log`);
    await fs.appendFile(historyFile, data).catch(() => undefined);

    terminal.sockets.forEach((socket) => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify({ type: 'output', data }));
      }
    });
  });

  terminals.set(key, terminal);
  return terminal;
}

export function registerSocket(terminal, socket) {
  terminal.sockets.add(socket);
  socket.send(JSON.stringify({ type: 'history', data: terminal.history }));
  terminal.expiresAt = Date.now() + SESSION_TTL_MS;
}

export function resizeTerminal(terminal, cols, rows) {
  terminal.ptyProcess.resize(Math.max(2, cols), Math.max(2, rows));
  terminal.expiresAt = Date.now() + SESSION_TTL_MS;
}

export function writeInput(terminal, data) {
  terminal.ptyProcess.write(data);
  terminal.expiresAt = Date.now() + SESSION_TTL_MS;
}

export function removeSocket(terminal, socket) {
  terminal.sockets.delete(socket);
}

export async function destroyTerminal(key) {
  const terminal = terminals.get(key);
  if (!terminal) {
    return;
  }

  terminal.ptyProcess.kill();
  try {
    await runCommand('docker', ['rm', '-f', terminal.containerName]);
  } catch {
    // ignore
  }
  terminals.delete(key);
}

export function listTerminals() {
  return terminals;
}

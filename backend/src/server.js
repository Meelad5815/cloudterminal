import crypto from 'node:crypto';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { WebSocketServer } from 'ws';
import {
  createOrGetTerminal,
  destroyTerminal,
  listTerminals,
  registerSocket,
  removeSocket,
  resizeTerminal,
import { v4 as uuid } from 'uuid';
import {
  createOrGetSession,
  destroySession,
  getSessions,
  registerSocket,
  removeSocket,
  resizeSession,
  writeInput
} from './sessionManager.js';
import { listFiles, resolveForDownload, saveUploadedFile } from './fileService.js';

const app = express();
const server = http.createServer(app);
const wsServer = new WebSocketServer({ server, path: '/terminal' });
const upload = multer();

const sessions = new Map();
const SESSION_MAX_AGE_MS = Number(process.env.AUTH_SESSION_MAX_AGE_MS ?? 1000 * 60 * 60 * 12);

function createSession() {
  const token = crypto.randomBytes(24).toString('hex');
  const userId = crypto.randomUUID();
  sessions.set(token, { userId, expiresAt: Date.now() + SESSION_MAX_AGE_MS });
  return { token, userId };
}

function getSessionFromRequest(request) {
  const token = request.headers['x-session-token'];
  if (!token || !sessions.has(token)) {
    return null;
  }
  const session = sessions.get(token);
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  session.expiresAt = Date.now() + SESSION_MAX_AGE_MS;
  return session;
}

app.use(cors());
app.use(express.json());

app.get('/health', (_request, response) => {
  response.json({ ok: true, sessions: sessions.size, terminals: listTerminals().size });
});

app.post('/api/session', (_request, response) => {
  response.json(createSession());
});

app.get('/api/files', async (request, response) => {
  const session = getSessionFromRequest(request);
  if (!session) {
    response.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const data = await listFiles(session.userId, request.query.path);
  response.json({ ok: true, sessions: getSessions().size });
});

app.get('/api/files', async (request, response) => {
  try {
    const data = await listFiles(request.query.path);
    response.json(data);
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
});

app.post('/api/upload', upload.single('file'), async (request, response) => {
  const session = getSessionFromRequest(request);
  if (!session) {
    response.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!request.file) {
    response.status(400).json({ error: 'Missing file' });
    return;
  }

  try {
    const target = await saveUploadedFile(session.userId, request.file, request.body.path || '.');
  try {
    const target = await saveUploadedFile(request.file, request.body.path || '/workspace');
    response.json({ ok: true, target });
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
});

app.get('/api/download', (request, response) => {
  const session = getSessionFromRequest(request);
  if (!session) {
    response.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const filePath = resolveForDownload(session.userId, request.query.path);
  try {
    const filePath = resolveForDownload(request.query.path);
    response.download(filePath);
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
});

app.get('/api/editor', (_request, response) => {
  response.redirect(process.env.VSCODE_WEB_URL || 'https://vscode.dev');
});

wsServer.on('connection', async (socket, request) => {
  const url = new URL(request.url, 'http://localhost');
  const token = url.searchParams.get('token');
  const terminalId = url.searchParams.get('terminalId') || crypto.randomUUID();
  const shell = url.searchParams.get('shell') || 'bash';
  const session = token ? sessions.get(token) : null;

  if (!session || session.expiresAt < Date.now()) {
    socket.send(JSON.stringify({ type: 'output', data: '\r\nUnauthorized session\r\n' }));
    socket.close();
    return;
  }

  try {
    const terminal = await createOrGetTerminal(session.userId, terminalId, shell);
    registerSocket(terminal, socket);

    socket.on('message', (raw) => {
      const payload = JSON.parse(raw.toString());
      if (payload.type === 'input' && typeof payload.data === 'string') {
        writeInput(terminal, payload.data);
      }
      if (payload.type === 'resize') {
        resizeTerminal(terminal, Number(payload.cols || 80), Number(payload.rows || 24));
  const sessionId = url.searchParams.get('tabId') || uuid();
  const shell = url.searchParams.get('shell') || 'bash';

  try {
    const session = await createOrGetSession(sessionId, shell);
    registerSocket(session, socket);

    socket.on('message', (raw) => {
      const payload = JSON.parse(raw.toString());
      if (payload.type === 'input') {
        writeInput(session, payload.data);
      }
      if (payload.type === 'resize') {
        resizeSession(session, Number(payload.cols || 80), Number(payload.rows || 24));
      }
    });

    socket.on('close', () => {
      removeSocket(terminal, socket);
      removeSocket(session, socket);
    });
  } catch (error) {
    socket.send(JSON.stringify({ type: 'output', data: `\r\nStartup failed: ${error.message}\r\n` }));
    socket.close();
  }
});

setInterval(() => {
  const now = Date.now();

  for (const [token, session] of sessions) {
    if (session.expiresAt < now) {
      sessions.delete(token);
    }
  }

  for (const [key, terminal] of listTerminals()) {
    if (terminal.expiresAt < now && !terminal.sockets.size) {
      destroyTerminal(key);
  for (const [sessionId, session] of getSessions()) {
    if (session.expiresAt < now && !session.sockets.size) {
      destroySession(sessionId);
    }
  }
}, 10_000);

const port = Number(process.env.PORT ?? 8080);
server.listen(port, '0.0.0.0', () => {
  console.log(`Cloud terminal backend on ${port}`);
});

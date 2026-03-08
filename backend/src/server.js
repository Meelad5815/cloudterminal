import http from 'node:http';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { WebSocketServer } from 'ws';
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

app.use(cors());
app.use(express.json());

app.get('/health', (_request, response) => {
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
  try {
    const target = await saveUploadedFile(request.file, request.body.path || '/workspace');
    response.json({ ok: true, target });
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
});

app.get('/api/download', (request, response) => {
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
      removeSocket(session, socket);
    });
  } catch (error) {
    socket.send(JSON.stringify({ type: 'output', data: `\r\nStartup failed: ${error.message}\r\n` }));
    socket.close();
  }
});

setInterval(() => {
  const now = Date.now();
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

import path from 'node:path';
import fs from 'node:fs/promises';

const WORKSPACES_ROOT = process.env.WORKSPACES_ROOT ?? '/workspace/sessions';

function safeId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

function userRoot(userId) {
  return path.join(WORKSPACES_ROOT, safeId(userId));
}

function safeResolve(userId, requestedPath = '.') {
  const root = userRoot(userId);
  const target = path.resolve(root, requestedPath);
  if (!target.startsWith(root)) {
    throw new Error('Path escapes user workspace');
  }
  return target;
}

export async function listFiles(userId, requestedPath) {
  const root = userRoot(userId);
  await fs.mkdir(root, { recursive: true });
  const fullPath = safeResolve(userId, requestedPath || '.');
  const entries = await fs.readdir(fullPath, { withFileTypes: true });
  return {
    path: path.relative(root, fullPath) || '.',
const ROOT = '/workspace';

function safeResolve(requestedPath = ROOT) {
  const targetPath = path.resolve(ROOT, `.${requestedPath.replace(ROOT, '')}`);
  if (!targetPath.startsWith(ROOT)) {
    throw new Error('Path escapes workspace');
  }
  return targetPath;
}

export async function listFiles(requestedPath) {
  const fullPath = safeResolve(requestedPath);
  const entries = await fs.readdir(fullPath, { withFileTypes: true });
  return {
    path: fullPath,
    files: entries
      .map((entry) => ({
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
        path: path.relative(root, path.join(fullPath, entry.name)) || '.'
        path: path.join(fullPath, entry.name)
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  };
}

export async function saveUploadedFile(userId, file, requestedPath) {
  const folder = safeResolve(userId, requestedPath || '.');
  await fs.mkdir(folder, { recursive: true });
  const target = path.join(folder, path.basename(file.originalname));
  await fs.writeFile(target, file.buffer);
  return path.relative(userRoot(userId), target);
}

export function resolveForDownload(userId, requestedPath) {
  return safeResolve(userId, requestedPath || '.');
export async function saveUploadedFile(file, requestedPath) {
  const folder = safeResolve(requestedPath);
  await fs.mkdir(folder, { recursive: true });
  const target = path.join(folder, file.originalname);
  await fs.writeFile(target, file.buffer);
  return target;
}

export function resolveForDownload(requestedPath) {
  return safeResolve(requestedPath);
}

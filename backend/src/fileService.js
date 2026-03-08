import path from 'node:path';
import fs from 'node:fs/promises';

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
        path: path.join(fullPath, entry.name)
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  };
}

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

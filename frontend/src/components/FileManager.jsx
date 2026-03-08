import { useEffect, useRef, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8080/api`;

export function FileManager({ sessionToken }) {
  const [files, setFiles] = useState([]);
  const [path, setPath] = useState('.');
  const inputRef = useRef(null);

  const headers = { 'x-session-token': sessionToken };

  const refresh = async (target = path) => {
    const response = await fetch(`${API_URL}/files?path=${encodeURIComponent(target)}`, { headers });
    if (!response.ok) {
      return;
    }
    const payload = await response.json();
    setFiles(payload.files ?? []);
    setPath(payload.path ?? '.');
  };

  useEffect(() => {
    refresh('.');
  }, [sessionToken]);

  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);

    await fetch(`${API_URL}/upload`, { method: 'POST', headers, body: formData });
    await refresh(path);
  };

  const downloadFile = async (target) => {
    const response = await fetch(`${API_URL}/download?path=${encodeURIComponent(target)}`, { headers });
    if (!response.ok) {
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = target.split('/').pop();
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="file-manager">
      <div className="file-manager-header">
        <strong>Files</strong>
        <button onClick={() => refresh(path)}>Refresh</button>
      </div>
      <small>{path}</small>
      <ul>
        {files.map((file) => (
          <li key={`${file.name}-${file.type}`}>
            {file.type === 'directory' ? (
              <button onClick={() => refresh(file.path)}>📁 {file.name}</button>
            ) : (
              <button onClick={() => downloadFile(file.path)}>📄 {file.name}</button>
            )}
          </li>
        ))}
      </ul>
      <div className="file-manager-actions">
        <button onClick={() => inputRef.current?.click()}>Upload</button>
        <input ref={inputRef} onChange={upload} hidden type="file" />
      </div>
    </aside>
  );
}

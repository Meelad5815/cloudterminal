import { useEffect, useRef, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8080/api`;

export function FileManager() {
  const [files, setFiles] = useState([]);
  const [path, setPath] = useState('/workspace');
  const inputRef = useRef(null);

  const refresh = async (target = path) => {
    const response = await fetch(`${API_URL}/files?path=${encodeURIComponent(target)}`);
    const payload = await response.json();
    setFiles(payload.files ?? []);
    setPath(payload.path ?? '/workspace');
  };

  useEffect(() => {
    refresh('/workspace');
  }, []);

  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);

    await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
    await refresh(path);
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
              <a href={`${API_URL}/download?path=${encodeURIComponent(file.path)}`}>📄 {file.name}</a>
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

import { useEffect, useMemo, useState } from 'react';
import { TerminalTabs } from './components/TerminalTabs';
import { FileManager } from './components/FileManager';

const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8080/api`;

const themes = {
  midnight: { background: '#0b1020', foreground: '#d6deff', cursor: '#7ee787' },
  matrix: { background: '#020f02', foreground: '#b7ffb7', cursor: '#00ff41' },
  graphite: { background: '#171717', foreground: '#f5f5f5', cursor: '#f59e0b' }
};

export function App() {
  const [themeName, setThemeName] = useState('midnight');
  const [showFileManager, setShowFileManager] = useState(true);
  const [sessionToken, setSessionToken] = useState(localStorage.getItem('sessionToken') || '');

  const theme = useMemo(() => themes[themeName], [themeName]);

  useEffect(() => {
    const ensureSession = async () => {
      if (sessionToken) {
        return;
      }

      const response = await fetch(`${API_BASE}/session`, { method: 'POST' });
      const payload = await response.json();
      localStorage.setItem('sessionToken', payload.token);
      setSessionToken(payload.token);
    };

    ensureSession();
  }, [sessionToken]);

  if (!sessionToken) {
    return <div className="loading">Bootstrapping isolated terminal session...</div>;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>Cloud Web Terminal</h1>
        <div className="topbar-controls">
          <label>
            Theme
            <select value={themeName} onChange={(event) => setThemeName(event.target.value)}>
              {Object.keys(themes).map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
          <button onClick={() => setShowFileManager((prev) => !prev)}>{showFileManager ? 'Hide' : 'Show'} files</button>
          <a href="/api/editor" target="_blank" rel="noreferrer">Open VS Code Web</a>
        </div>
      </header>
      <div className="workspace-grid">
        {showFileManager && <FileManager sessionToken={sessionToken} />}
        <TerminalTabs theme={theme} sessionToken={sessionToken} />
      </div>
    </div>
  );
}

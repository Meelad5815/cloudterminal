import { useMemo, useState } from 'react';
import { TerminalTabs } from './components/TerminalTabs';
import { FileManager } from './components/FileManager';

const themes = {
  midnight: {
    background: '#0b1020',
    foreground: '#d6deff',
    cursor: '#7ee787',
    black: '#1c1f26',
    brightBlack: '#4c566a',
    red: '#ff7b72',
    brightRed: '#ffa198',
    green: '#3fb950',
    brightGreen: '#56d364',
    yellow: '#d29922',
    brightYellow: '#e3b341',
    blue: '#58a6ff',
    brightBlue: '#79c0ff',
    magenta: '#bc8cff',
    brightMagenta: '#d2a8ff',
    cyan: '#39c5cf',
    brightCyan: '#56d4dd',
    white: '#f0f6fc',
    brightWhite: '#ffffff'
  },
  matrix: {
    background: '#020f02',
    foreground: '#b7ffb7',
    cursor: '#00ff41'
  },
  graphite: {
    background: '#171717',
    foreground: '#f5f5f5',
    cursor: '#f59e0b'
  }
};

export function App() {
  const [themeName, setThemeName] = useState('midnight');
  const [showFileManager, setShowFileManager] = useState(true);

  const theme = useMemo(() => themes[themeName], [themeName]);

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
          <button onClick={() => setShowFileManager((prev) => !prev)}>
            {showFileManager ? 'Hide' : 'Show'} files
          </button>
          <a href="/api/editor" target="_blank" rel="noreferrer">Open VS Code Web</a>
        </div>
      </header>
      <div className="workspace-grid">
        {showFileManager && <FileManager />}
        <TerminalTabs theme={theme} />
      </div>
    </div>
  );
}

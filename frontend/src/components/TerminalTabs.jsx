import { useMemo, useState } from 'react';
import { TerminalView } from './TerminalView';

const createTab = (shell = 'bash') => {
  const id = crypto.randomUUID();
  return { id, label: `Terminal ${id.slice(0, 4)}`, shell };
};

export function TerminalTabs({ theme, sessionToken }) {
  const [tabs, setTabs] = useState(() => [createTab()]);
  const [activeTabId, setActiveTabId] = useState(() => tabs[0].id);

  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId), [tabs, activeTabId]);

  const addTab = (shell) => {
    const next = createTab(shell);
    setTabs((prev) => [...prev, next]);
    setActiveTabId(next.id);
  };

  const closeTab = (id) => {
    setTabs((prev) => {
      const filtered = prev.filter((tab) => tab.id !== id);
      if (!filtered.length) {
        const fallback = createTab();
        setActiveTabId(fallback.id);
        return [fallback];
      }
      if (activeTabId === id) {
        setActiveTabId(filtered[filtered.length - 1].id);
      }
      return filtered;
    });
  };

  return (
    <section className="terminal-panel">
      <div className="tabbar">
        <div className="tabbar-left">
          {tabs.map((tab) => (
            <button key={tab.id} className={`tab ${tab.id === activeTabId ? 'active' : ''}`} onClick={() => setActiveTabId(tab.id)}>
              {tab.label} ({tab.shell})
              <span className="close" role="button" tabIndex={0} onClick={(event) => { event.stopPropagation(); closeTab(tab.id); }}>×</span>
            </button>
          ))}
        </div>
        <div className="tabbar-actions">
          <button onClick={() => addTab('bash')}>+ Bash</button>
          <button onClick={() => addTab('zsh')}>+ Zsh</button>
        </div>
      </div>
      {activeTab && <TerminalView key={activeTab.id} tab={activeTab} theme={theme} sessionToken={sessionToken} />}
    </section>
  );
}

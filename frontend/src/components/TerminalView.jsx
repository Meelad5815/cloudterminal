import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';

const WS_URL = (import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:8080`).replace(/\/$/, '');

export function TerminalView({ tab, theme, sessionToken }) {
  const containerRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
      fontSize: 14,
      scrollback: 5000,
      theme
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());
    terminal.open(containerRef.current);
    fitAddon.fit();

    const ws = new WebSocket(`${WS_URL}/terminal?terminalId=${tab.id}&shell=${tab.shell}&token=${sessionToken}`);

    const send = (payload) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
      }
    };

    ws.onopen = () => {
      setConnected(true);
      send({ type: 'resize', cols: terminal.cols, rows: terminal.rows });
    };

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'output') {
        terminal.write(payload.data);
      }
      if (payload.type === 'history') {
        payload.data.forEach((entry) => terminal.write(entry));
      }
    };

    ws.onclose = () => setConnected(false);

    terminal.onData((data) => send({ type: 'input', data }));
    terminal.attachCustomKeyEventHandler((event) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'c') {
        navigator.clipboard.writeText(terminal.getSelection()).catch(() => undefined);
        return false;
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'v') {
        navigator.clipboard.readText().then((text) => send({ type: 'input', data: text })).catch(() => undefined);
        return false;
      }
      return true;
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      send({ type: 'resize', cols: terminal.cols, rows: terminal.rows });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      ws.close();
      terminal.dispose();
    };
  }, [tab.id, tab.shell, theme, sessionToken]);

  return (
    <div className="terminal-wrapper">
      <div className="terminal-status">{connected ? 'Connected' : 'Disconnected'} • {tab.shell}</div>
      <div className="terminal-instance" ref={containerRef} />
    </div>
  );
}

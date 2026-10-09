import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { TerminalSquare, Trash2, Play, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

const QUICK_CMDS = [
  { label: 'List games', cmd: 'ls -la' },
  { label: 'Disk usage', cmd: 'du -sh */ 2>/dev/null | sort -h | tail -10' },
  { label: 'Node version', cmd: 'node --version' },
  { label: 'Find JS files', cmd: 'find . -name "*.js" -not -path "*/node_modules/*" | head -20' },
];

export default function TerminalPanel() {
  const { ws, clientId, currentGame } = useStore();
  const [lines, setLines] = useState([
    { type: 'info', text: 'AI Game Studio Terminal — type a command and press Enter.' },
    { type: 'info', text: 'The terminal runs in the games/ directory on the server.' },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const scrollRef = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    if (!ws) return;
    const handler = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'terminal_output') {
          setLines((l) => [...l, { type: 'out', text: msg.data }]);
        }
      } catch {}
    };
    ws.addEventListener('message', handler);
    return () => ws.removeEventListener('message', handler);
  }, [ws]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  const run = (cmd) => {
    if (!ws || ws.readyState !== 1) {
      setLines((l) => [...l, { type: 'err', text: '⚠ Not connected to server.' }]);
      return;
    }
    ws.send(JSON.stringify({ type: 'terminal_command', command: cmd }));
    setHistory((h) => [cmd, ...h].slice(0, 50));
    setHistIdx(-1);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = input.trim();
      if (cmd) run(cmd);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(histIdx + 1, history.length - 1);
      if (next >= 0) { setHistIdx(next); setInput(history[next]); }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = histIdx - 1;
      setHistIdx(next);
      setInput(next >= 0 ? history[next] : '');
    }
  };

  return (
    <div className="h-full flex flex-col bg-studio-bg">
      <div className="h-9 flex items-center justify-between px-3 border-b border-studio-border bg-studio-surface shrink-0">
        <div className="flex items-center gap-2">
          <TerminalSquare className="w-3.5 h-3.5 text-studio-gold" />
          <span className="text-xs text-studio-text-dim font-mono">bash — games/</span>
        </div>
        <button onClick={() => setLines([])} className="btn-ghost p-1.5" title="Clear">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-studio-border overflow-x-auto shrink-0">
        {QUICK_CMDS.map((q) => (
          <button key={q.cmd} onClick={() => run(q.cmd)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-studio-panel border border-studio-border text-[10px] text-studio-text-dim hover:text-studio-gold hover:border-studio-gold/40 transition-all whitespace-nowrap">
            <Play className="w-2.5 h-2.5" /> {q.label}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 font-mono text-[12px] leading-relaxed">
        {lines.map((l, i) => (
          <pre key={i} className={clsx('whitespace-pre-wrap break-all',
            l.type === 'err' ? 'text-red-400' :
            l.type === 'info' ? 'text-studio-gold-dim' : 'text-studio-text-dim')}>
            {l.text}
          </pre>
        ))}
      </div>

      <div className="flex items-center gap-2 px-3 py-2 border-t border-studio-border bg-studio-surface shrink-0">
        <ChevronRight className="w-3.5 h-3.5 text-studio-gold shrink-0" />
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey}
          placeholder="Enter command…"
          className="flex-1 bg-transparent border-none outline-none text-[12px] font-mono text-studio-text placeholder:text-studio-text-muted" />
      </div>
    </div>
  );
}

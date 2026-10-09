import React from 'react';
import { useStore } from '../store/useStore';
import { FileCode, FileJson, FileText } from 'lucide-react';
import clsx from 'clsx';

export function fileIcon(path) {
  if (path?.endsWith('.html')) return <FileCode className="w-3.5 h-3.5 text-orange-400" />;
  if (path?.endsWith('.js') || path?.endsWith('.jsx')) return <FileCode className="w-3.5 h-3.5 text-yellow-400" />;
  if (path?.endsWith('.json')) return <FileJson className="w-3.5 h-3.5 text-blue-400" />;
  if (path?.endsWith('.css')) return <FileText className="w-3.5 h-3.5 text-sky-400" />;
  return <FileText className="w-3.5 h-3.5 text-studio-text-muted" />;
}

export function langFor(path) {
  if (path?.endsWith('.html')) return 'html';
  if (path?.endsWith('.json')) return 'json';
  if (path?.endsWith('.css')) return 'css';
  if (path?.endsWith('.md')) return 'markdown';
  return 'javascript';
}

export default function FileTree() {
  const { files, activeFile, setActiveFile, currentGame, dirtyFiles } = useStore();

  return (
    <div className="h-full flex flex-col bg-studio-surface border-r border-studio-border">
      <div className="px-3 py-2 border-b border-studio-border flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-studio-text-muted">Explorer</span>
        <span className="text-[10px] text-studio-text-muted font-mono">{files.length} files</span>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {files.map((f) => (
          <button key={f.path} onClick={() => setActiveFile(f.path)}
            className={clsx('w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors text-left',
              activeFile === f.path
                ? 'bg-studio-gold/10 text-studio-gold border-l-2 border-studio-gold'
                : 'text-studio-text-dim hover:bg-studio-panel hover:text-studio-text border-l-2 border-transparent')}>
            {fileIcon(f.path)}
            <span className="truncate font-mono text-[11px]">{f.path}</span>
            {dirtyFiles.has(f.path) && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-studio-gold" />}
          </button>
        ))}
      </div>
      {currentGame?.controls && (
        <div className="px-3 py-2 border-t border-studio-border text-[10px] text-studio-text-muted">
          🎮 {currentGame.controls}
        </div>
      )}
    </div>
  );
}

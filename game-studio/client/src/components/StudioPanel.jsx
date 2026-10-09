import React from 'react';
import { useStore } from '../store/useStore';
import { Play, Code2, TerminalSquare, RefreshCw, ExternalLink, Gamepad2 } from 'lucide-react';
import PreviewFrame from './PreviewFrame';
import CodeWorkspace from './CodeWorkspace';
import TerminalPanel from './TerminalPanel';
import clsx from 'clsx';

const TABS = [
  { id: 'preview', label: 'Preview', icon: Play },
  { id: 'code', label: 'Code', icon: Code2 },
  { id: 'terminal', label: 'Terminal', icon: TerminalSquare },
];

export default function StudioPanel() {
  const { activeTab, setActiveTab, currentGame, previewUrl, setPreviewUrl } = useStore();

  return (
    <div className="h-full flex flex-col bg-studio-bg">
      {/* Tab bar */}
      <div className="h-10 flex items-center justify-between px-2 border-b border-studio-border bg-studio-surface shrink-0">
        <div className="flex items-center gap-0.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all',
                  activeTab === tab.id
                    ? 'bg-studio-gold/10 text-studio-gold border border-studio-gold/30'
                    : 'text-studio-text-dim hover:text-studio-text hover:bg-studio-panel border border-transparent'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1">
          {currentGame && activeTab === 'preview' && (
            <>
              <button
                onClick={() => setPreviewUrl(previewUrl ? previewUrl.split('?')[0] + '?t=' + Date.now() : null)}
                className="btn-ghost p-1.5"
                title="Reload game"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <a
                href={previewUrl?.split('?')[0]}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost p-1.5"
                title="Open in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </>
          )}
          {currentGame && (
            <div className="hidden lg:flex items-center gap-2 ml-2 pl-2 border-l border-studio-border">
              <Gamepad2 className="w-3.5 h-3.5 text-studio-gold" />
              <span className="text-xs text-studio-text-dim max-w-[140px] truncate">
                {currentGame.title}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'preview' && <PreviewFrame />}
        {activeTab === 'code' && <CodeWorkspace />}
        {activeTab === 'terminal' && <TerminalPanel />}
      </div>
    </div>
  );
}

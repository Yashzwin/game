import React from 'react';
import { Film, Settings, History, Github, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function TopBar() {
  const { setSettingsOpen, setHistoryOpen, selectedModel, generating } = useStore();

  return (
    <div className="h-12 flex items-center justify-between px-4 border-b border-studio-border bg-studio-surface shrink-0 relative">
      {/* Gold top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-studio-gold/60 to-transparent" />

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-studio-gold to-studio-gold-dim flex items-center justify-center">
            <Film className="w-4 h-4 text-black" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold text-studio-text tracking-tight">
              AI Game Studio
            </span>
            <span className="text-[10px] text-studio-gold-dim tracking-widest uppercase">
              Cinema Edition
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-studio-panel border border-studio-border text-[11px] text-studio-text-dim">
          <Sparkles className="w-3 h-3 text-studio-gold" />
          <span className="font-mono">{selectedModel.split('/').pop()}</span>
          {generating && <span className="w-1.5 h-1.5 rounded-full bg-studio-gold animate-pulse-gold" />}
        </div>

        <button
          onClick={() => setHistoryOpen(true)}
          className="btn-ghost flex items-center gap-1.5 text-xs"
          title="Game History"
        >
          <History className="w-4 h-4" />
          <span className="hidden sm:inline">History</span>
        </button>

        <button
          onClick={() => setSettingsOpen(true)}
          className="btn-ghost flex items-center gap-1.5 text-xs"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Settings</span>
        </button>
      </div>
    </div>
  );
}

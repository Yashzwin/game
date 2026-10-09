import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { User, Sparkles, FileCode, ChevronDown, ChevronRight, Gamepad2, Eye, AlertCircle, Check } from 'lucide-react';
import { gamesApi } from '../utils/api';
import clsx from 'clsx';

export default function MessageBubble({ message }) {
  const { streamingText, setCurrentGame, setPreviewUrl, setActiveTab } = useStore();
  const [expanded, setExpanded] = useState(false);
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex gap-2.5 animate-slide-up">
        <div className="w-7 h-7 rounded-md bg-studio-panel border border-studio-border flex items-center justify-center shrink-0">
          <User className="w-3.5 h-3.5 text-studio-text-dim" />
        </div>
        <div className="flex-1 pt-1">
          <div className="text-sm text-studio-text leading-relaxed whitespace-pre-wrap">{message.content}</div>
        </div>
      </div>
    );
  }

  const isLoading = message.streaming && message.kind === 'status';

  return (
    <div className="flex gap-2.5 animate-slide-up">
      <div className={clsx('w-7 h-7 rounded-md flex items-center justify-center shrink-0 border',
        message.kind === 'error' ? 'bg-red-500/10 border-red-500/30' :
        message.kind === 'complete' ? 'bg-studio-gold/15 border-studio-gold/40' :
        'bg-studio-panel border-studio-border')}>
        {message.kind === 'error' ? <AlertCircle className="w-3.5 h-3.5 text-red-400" /> :
         message.kind === 'complete' ? <Check className="w-3.5 h-3.5 text-studio-gold" /> :
         <Sparkles className="w-3.5 h-3.5 text-studio-gold" />}
      </div>
      <div className="flex-1 pt-1 min-w-0">
        <div className={clsx('text-sm leading-relaxed',
          message.kind === 'error' ? 'text-red-400' :
          message.kind === 'complete' ? 'text-studio-text font-medium' :
          'text-studio-text-dim')}>
          {message.content}
          {isLoading && <span className="inline-block w-1.5 h-3.5 ml-1 bg-studio-gold animate-pulse-gold align-middle" />}
        </div>

        {/* Saved files list */}
        {message.files && message.files.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.files.map((f) => (
              <div key={f} className="flex items-center gap-2 text-[11px] text-studio-text-dim font-mono">
                <FileCode className="w-3 h-3 text-studio-gold-dim" />
                {f}
              </div>
            ))}
          </div>
        )}

        {/* Complete: show game card */}
        {message.kind === 'complete' && message.gameMeta && (
          <GameResultCard meta={message.gameMeta} />
        )}

        {/* Raw error response toggle */}
        {message.rawResponse && (
          <div className="mt-2">
            <button onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[10px] text-studio-text-muted hover:text-studio-text-dim">
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Raw AI output
            </button>
            {expanded && (
              <pre className="mt-1 p-2 bg-studio-bg rounded text-[10px] font-mono text-studio-text-muted overflow-x-auto max-h-32">
                {message.rawResponse}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function GameResultCard({ meta }) {
  const { setCurrentGame, setPreviewUrl, setActiveTab } = useStore();
  const [loading, setLoading] = useState(false);

  const openGame = async () => {
    setLoading(true);
    try {
      const data = await gamesApi.get(meta.id);
      setCurrentGame(data.meta);
      useStore.getState().setFiles(data.files);
      if (data.files.length > 0) useStore.getState().setActiveFile(data.files[0].path);
      setPreviewUrl(`/games/${meta.id}/${meta.mainFile}?t=${Date.now()}`);
      setActiveTab('preview');
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="mt-3 panel p-3 glow-gold">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-md bg-gradient-to-br from-studio-gold/30 to-studio-gold-dim/20 border border-studio-gold/30 flex items-center justify-center shrink-0">
          <Gamepad2 className="w-5 h-5 text-studio-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-studio-text">{meta.title}</h4>
          <p className="text-[11px] text-studio-text-dim mt-0.5 line-clamp-2">{meta.description}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            <Tag>{meta.gameType?.toUpperCase()}</Tag>
            <Tag>{meta.engine}</Tag>
            {meta.genre && <Tag>{meta.genre}</Tag>}
            <Tag>{meta.files?.length || 0} files</Tag>
          </div>
        </div>
      </div>
      {meta.controls && (
        <div className="mt-2 text-[10px] text-studio-text-muted">
          🎮 {meta.controls}
        </div>
      )}
      <button onClick={openGame} disabled={loading}
        className="btn-gold w-full mt-3 text-xs flex items-center justify-center gap-1.5">
        <Eye className="w-3.5 h-3.5" />
        {loading ? 'Loading…' : 'Open in Studio'}
      </button>
    </div>
  );
}

function Tag({ children }) {
  return (
    <span className="px-1.5 py-0.5 rounded bg-studio-gold/10 border border-studio-gold/20 text-[9px] text-studio-gold uppercase tracking-wide font-medium">
      {children}
    </span>
  );
}

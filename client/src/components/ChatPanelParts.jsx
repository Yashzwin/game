import React from 'react';
import { useStore } from '../store/useStore';
import { Loader2, Brain, ChevronDown, ChevronRight } from 'lucide-react';
import MessageBubble from './MessageBubble';
import QuickTemplates from './QuickTemplates';
import EmptyState from './EmptyState';

export function MessageList({ scrollRef }) {
  const { messages, generating, thinkingText, showThinking, toggleThinking } = useStore();

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.length === 0 && <EmptyState />}
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}

      {generating && thinkingText && (
        <div className="panel overflow-hidden animate-slide-up">
          <button onClick={toggleThinking}
            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-studio-gold hover:bg-studio-gold/5 transition-colors">
            {showThinking ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <Brain className="w-3.5 h-3.5" />
            <span>AI Reasoning</span>
          </button>
          {showThinking && (
            <div className="px-3 pb-3 text-[11px] font-mono text-studio-text-dim max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed border-t border-studio-border pt-2">
              {thinkingText}
            </div>
          )}
        </div>
      )}

      {generating && !thinkingText && (
        <div className="flex items-center gap-2 text-xs text-studio-gold">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="thinking-shimmer font-medium">AI is working…</span>
        </div>
      )}
    </div>
  );
}

export function ChatInput({ input, setInput, handleSend, handleKeyDown, mode, generating, selectedModel }) {
  const { messages } = useStore();
  return (
    <>
      {messages.length === 0 && (
        <div className="px-4 pb-2 shrink-0">
          <QuickTemplates onSelect={(t) => setInput(t)} />
        </div>
      )}
      <div className="p-4 border-t border-studio-border shrink-0">
        <div className="relative">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={mode === 'iterate' ? 'Describe changes to make…' : 'Describe your game — genre, style, mechanics…'}
            rows={3} disabled={generating}
            className="input-studio w-full resize-none text-sm pr-12 disabled:opacity-50" />
          <button onClick={handleSend} disabled={!input.trim() || generating}
            className="absolute bottom-2.5 right-2.5 w-8 h-8 rounded-md bg-gradient-to-b from-studio-gold to-studio-gold-dim text-black flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 transition-all">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendIcon />}
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] text-studio-text-muted">
          <span>{mode === 'iterate' ? '🔄 Iterate mode' : '✨ Create mode'} · Enter to send</span>
          <span className="font-mono">{selectedModel.split('/').pop()}</span>
        </div>
      </div>
    </>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

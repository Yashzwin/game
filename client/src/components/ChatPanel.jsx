import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { aiApi } from '../utils/api';
import { Sparkles } from 'lucide-react';
import { MessageList, ChatInput } from './ChatPanelParts';
import clsx from 'clsx';

export default function ChatPanel() {
  const {
    messages, addMessage, generating, selectedModel, clientId,
    thinkingText, showThinking, toggleThinking, currentGame, resetStreaming,
  } = useStore();

  const [input, setInput] = useState('');
  const [mode, setMode] = useState('create');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, generating, thinkingText]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || generating) return;
    addMessage({ role: 'user', content: text, ts: Date.now() });
    setInput('');

    if (mode === 'iterate' && currentGame) {
      addMessage({ role: 'assistant', content: `🔄 Applying changes to "${currentGame.title}"…`, kind: 'status', streaming: true });
      resetStreaming();
      try {
        await aiApi.iterate(currentGame.id, { instruction: text, clientId, model: selectedModel });
      } catch (e) {
        addMessage({ role: 'assistant', content: `❌ ${e.message}`, kind: 'error', streaming: false });
      }
    } else {
      addMessage({ role: 'assistant', content: '🎬 Generating your game…', kind: 'status', streaming: true });
      resetStreaming();
      try {
        await aiApi.generate({
          prompt: text, clientId, model: selectedModel,
          conversationHistory: messages.filter((m) => m.role === 'user').slice(-4).map((m) => ({ role: 'user', content: m.content })),
        });
      } catch (e) {
        addMessage({ role: 'assistant', content: `❌ ${e.message}`, kind: 'error', streaming: false });
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="h-full flex flex-col bg-studio-surface border-r border-studio-border">
      <div className="px-4 py-3 border-b border-studio-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-studio-gold" />
          <span className="text-sm font-medium text-studio-text">Studio Director</span>
        </div>
        <div className="flex items-center bg-studio-panel rounded-md p-0.5 border border-studio-border">
          <button onClick={() => setMode('create')}
            className={clsx('px-2.5 py-1 text-[11px] rounded transition-all',
              mode === 'create' ? 'bg-studio-gold text-black font-medium' : 'text-studio-text-dim hover:text-studio-text')}>
            Create
          </button>
          <button onClick={() => currentGame && setMode('iterate')} disabled={!currentGame}
            className={clsx('px-2.5 py-1 text-[11px] rounded transition-all disabled:opacity-30',
              mode === 'iterate' ? 'bg-studio-gold text-black font-medium' : 'text-studio-text-dim hover:text-studio-text')}>
            Iterate
          </button>
        </div>
      </div>
      <MessageList scrollRef={scrollRef} />
      <ChatInput input={input} setInput={setInput} handleSend={handleSend} handleKeyDown={handleKeyDown} mode={mode} generating={generating} selectedModel={selectedModel} />
    </div>
  );
}

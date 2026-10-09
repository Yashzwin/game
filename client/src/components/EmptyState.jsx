import React from 'react';
import { Sparkles } from 'lucide-react';

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center px-4">
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-studio-gold/20 to-studio-gold-dim/10 border border-studio-gold/30 flex items-center justify-center mb-4">
        <Sparkles className="w-7 h-7 text-studio-gold" />
      </div>
      <h3 className="text-base font-medium text-studio-text mb-1">Describe your game</h3>
      <p className="text-xs text-studio-text-dim leading-relaxed max-w-xs">
        Tell me the genre, style, and mechanics. I'll build a complete, playable game — 2D or 3D —
        with multiple files, then run it live in the preview.
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5 justify-center text-[10px] text-studio-text-muted">
        <span className="px-2 py-1 rounded bg-studio-panel border border-studio-border">🎯 2D Platformer</span>
        <span className="px-2 py-1 rounded bg-studio-panel border border-studio-border">🌌 3D Space</span>
        <span className="px-2 py-1 rounded bg-studio-panel border border-studio-border">🧩 Puzzle</span>
        <span className="px-2 py-1 rounded bg-studio-panel border border-studio-border">🏎️ Racing</span>
      </div>
    </div>
  );
}

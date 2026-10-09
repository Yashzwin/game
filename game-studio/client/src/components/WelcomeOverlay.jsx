import React from 'react';
import { Film, Sparkles, Gamepad2, Eye, Code2, TerminalSquare, X } from 'lucide-react';

const FEATURES = [
  { icon: Sparkles, title: 'Agentic AI Director', desc: 'Describe a game — the AI plans, designs, and writes every file.' },
  { icon: Gamepad2, title: '2D + 3D Games', desc: 'Phaser.js for 2D, Three.js for 3D — picked automatically.' },
  { icon: Code2, title: 'Multi-file Projects', desc: 'Full source tree with a Monaco editor and live save.' },
  { icon: Eye, title: 'AI Vision Review', desc: 'Screenshot your game for art & UI feedback.' },
  { icon: TerminalSquare, title: 'Built-in Terminal', desc: 'Inspect and run commands against your project.' },
];

export default function WelcomeOverlay({ onDismiss }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-studio-surface border border-studio-gold/25 rounded-2xl overflow-hidden glow-gold animate-slide-up">
        <div className="h-1 bg-gradient-to-r from-transparent via-studio-gold to-transparent" />
        <button onClick={onDismiss} className="absolute top-3 right-3 btn-ghost p-1.5 z-10">
          <X className="w-4 h-4" />
        </button>

        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-studio-gold to-studio-gold-dim flex items-center justify-center">
              <Film className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-studio-text tracking-tight">AI Game Studio</h1>
              <p className="text-xs text-studio-gold-dim tracking-widest uppercase">Cinema Edition</p>
            </div>
          </div>

          <p className="text-sm text-studio-text-dim leading-relaxed mb-6">
            A professional, agentic game development studio. Describe any game — 2D or 3D — and watch
            the AI design, code, and run it live. Everything is transparent: you see the reasoning,
            the files, and the terminal.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="flex items-start gap-3 p-3 rounded-lg bg-studio-panel border border-studio-border">
                  <div className="w-8 h-8 rounded-md bg-studio-gold/10 border border-studio-gold/20 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-studio-gold" />
                  </div>
                  <div>
                    <h3 className="text-xs font-medium text-studio-text">{f.title}</h3>
                    <p className="text-[11px] text-studio-text-muted leading-relaxed mt-0.5">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={onDismiss} className="btn-gold w-full flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            Start Creating
          </button>
        </div>
      </div>
    </div>
  );
}

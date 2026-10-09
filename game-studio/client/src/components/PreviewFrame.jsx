import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Monitor, Smartphone, Square, Loader2, Gamepad2, Eye } from 'lucide-react';
import clsx from 'clsx';
import VisionAnalyzer from './VisionAnalyzer';

const VIEWPORTS = [
  { id: 'desktop', label: 'Desktop', icon: Monitor, w: '100%', h: '100%' },
  { id: 'square', label: 'Square', icon: Square, w: '640px', h: '640px' },
  { id: 'mobile', label: 'Mobile', icon: Smartphone, w: '390px', h: '720px' },
];

export default function PreviewFrame() {
  const { previewUrl, generating, currentGame } = useStore();
  const [viewport, setViewport] = useState('desktop');
  const [loading, setLoading] = useState(true);
  const [showVision, setShowVision] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 2500);
    return () => clearTimeout(t);
  }, [previewUrl]);

  if (!previewUrl) {
    return (
      <div className="h-full flex items-center justify-center text-center px-8">
        <div>
          <div className="w-16 h-16 rounded-2xl bg-studio-panel border border-studio-border flex items-center justify-center mx-auto mb-4">
            <Gamepad2 className="w-8 h-8 text-studio-text-muted" />
          </div>
          <h3 className="text-sm font-medium text-studio-text-dim mb-1">No game loaded</h3>
          <p className="text-xs text-studio-text-muted max-w-xs">
            Describe a game in the chat and it will appear here, fully playable.
          </p>
        </div>
      </div>
    );
  }

  const vp = VIEWPORTS.find((v) => v.id === viewport);

  return (
    <div className="h-full flex flex-col">
      {/* Preview toolbar */}
      <div className="h-9 flex items-center justify-between px-3 border-b border-studio-border bg-studio-surface/50 shrink-0">
        <div className="flex items-center gap-1">
          {VIEWPORTS.map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                onClick={() => setViewport(v.id)}
                className={clsx(
                  'p-1.5 rounded transition-all',
                  viewport === v.id ? 'bg-studio-gold/15 text-studio-gold' : 'text-studio-text-muted hover:text-studio-text-dim'
                )}
                title={v.label}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-studio-bg border border-studio-border text-[10px] font-mono text-studio-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-studio-success" />
            localhost/games/{currentGame?.id?.slice(0, 8)}
          </div>
          <button
            onClick={() => setShowVision(!showVision)}
            className={clsx(
              'flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all border',
              showVision
                ? 'bg-studio-gold/15 text-studio-gold border-studio-gold/30'
                : 'text-studio-text-dim border-studio-border hover:text-studio-gold hover:border-studio-gold/30'
            )}
            title="AI Vision analysis of your game"
          >
            <Eye className="w-3 h-3" />
            Vision
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Game viewport */}
        <div className="flex-1 relative flex items-center justify-center p-4 bg-[radial-gradient(circle_at_50%_0%,#1a1a20_0%,#0a0a0b_70%)]">
          {(loading || generating) && (
            <div className="absolute inset-0 flex items-center justify-center bg-studio-bg/60 backdrop-blur-sm z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 text-studio-gold animate-spin" />
                <span className="text-xs text-studio-gold-dim">
                  {generating ? 'Generating game…' : 'Loading game…'}
                </span>
              </div>
            </div>
          )}

          <div
            style={{ width: vp.w, height: vp.h, maxWidth: '100%', maxHeight: '100%' }}
            className="rounded-lg overflow-hidden border border-studio-border shadow-2xl bg-black"
          >
            <iframe
              ref={iframeRef}
              key={previewUrl}
              src={previewUrl}
              title="Game Preview"
              className="w-full h-full"
              sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups"
              onLoad={() => setLoading(false)}
            />
          </div>
        </div>

        {/* Vision panel */}
        {showVision && (
          <VisionAnalyzer iframeRef={iframeRef} onClose={() => setShowVision(false)} />
        )}
      </div>
    </div>
  );
}

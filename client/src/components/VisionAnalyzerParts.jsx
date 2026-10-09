import React from 'react';
import { Eye, Upload, Loader2, X, Image as ImageIcon, ScanSearch } from 'lucide-react';
import clsx from 'clsx';

export function VisionTabs({ tab, setTab }) {
  return (
    <div className="flex items-center gap-1 p-2 border-b border-studio-border">
      <button onClick={() => setTab('image')}
        className={clsx('flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[11px] transition-all',
          tab === 'image' ? 'bg-studio-gold/15 text-studio-gold' : 'text-studio-text-dim hover:text-studio-text')}>
        <ImageIcon className="w-3 h-3" /> Screenshot
      </button>
      <button onClick={() => setTab('code')}
        className={clsx('flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[11px] transition-all',
          tab === 'code' ? 'bg-studio-gold/15 text-studio-gold' : 'text-studio-text-dim hover:text-studio-text')}>
        <ScanSearch className="w-3 h-3" /> Code Review
      </button>
    </div>
  );
}

export function ImageTab({ fileRef, image, setImage, handleUpload, customPrompt, setCustomPrompt, runVision, loading }) {
  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
      {image ? (
        <div className="relative rounded-lg overflow-hidden border border-studio-border">
          <img src={image.url} alt="screenshot" className="w-full" />
          <button onClick={() => setImage(null)}
            className="absolute top-1.5 right-1.5 p-1 rounded bg-black/70 text-white hover:bg-black">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()}
          className="w-full aspect-video rounded-lg border border-dashed border-studio-border hover:border-studio-gold/40 flex flex-col items-center justify-center gap-2 text-studio-text-muted hover:text-studio-gold transition-all">
          <Upload className="w-5 h-5" />
          <span className="text-[11px]">Upload game screenshot</span>
        </button>
      )}
      <textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)}
        placeholder="Custom analysis prompt (optional)…" rows={2}
        className="input-studio w-full text-[11px] resize-none" />
      <button onClick={runVision} disabled={!image || loading}
        className="btn-gold w-full text-xs flex items-center justify-center gap-1.5">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
        Analyze Screenshot
      </button>
    </>
  );
}

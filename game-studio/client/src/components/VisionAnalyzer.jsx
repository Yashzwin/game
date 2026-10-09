import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { aiApi, filesApi } from '../utils/api';
import { Eye, Loader2, X, ScanSearch } from 'lucide-react';
import { VisionTabs, ImageTab } from './VisionAnalyzerParts';

export default function VisionAnalyzer({ onClose }) {
  const { currentGame, files } = useStore();
  const [tab, setTab] = useState('image');
  const [image, setImage] = useState(null);
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const fileRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { base64, mimetype } = await filesApi.uploadImage(file);
    setImage({ base64, mimetype, url: URL.createObjectURL(file) });
  };

  const runVision = async () => {
    if (!image) return;
    setLoading(true);
    setAnalysis('');
    try {
      const prompt =
        customPrompt ||
        `You are a game art director. Analyze this game screenshot and give professional feedback:
1. **Visual Style** — describe the aesthetic and quality
2. **UI/UX** — readability, layout, HUD clarity
3. **Improvements** — 3-5 specific, actionable suggestions
4. **Vibe** — what genre/feeling does it convey?`;
      const { analysis } = await aiApi.vision({ imageBase64: image.base64, prompt });
      setAnalysis(analysis);
    } catch (e) {
      setAnalysis(`❌ ${e.message}`);
    }
    setLoading(false);
  };

  const runCodeReview = async () => {
    setLoading(true);
    setAnalysis('');
    try {
      const codeContext = files
        .map((f) => `--- ${f.path} ---\n${f.content.slice(0, 4000)}`)
        .join('\n\n');
      const { analysis } = await aiApi.vision({
        prompt: `You are a senior game developer. Review this game code:

${codeContext}

Provide: 1) Architecture 2) Gameplay quality 3) Bugs/Risks 4) 3-5 improvements`,
      });
      setAnalysis(analysis);
    } catch (e) {
      setAnalysis(`❌ ${e.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="w-80 border-l border-studio-border bg-studio-surface flex flex-col shrink-0 animate-slide-up">
      <div className="flex items-center justify-between px-3 py-2 border-b border-studio-border">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-studio-gold" />
          <span className="text-xs font-medium text-studio-text">AI Vision</span>
        </div>
        <button onClick={onClose} className="btn-ghost p-1"><X className="w-3.5 h-3.5" /></button>
      </div>
      <VisionTabs tab={tab} setTab={setTab} />
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {tab === 'image' && (
          <ImageTab fileRef={fileRef} image={image} setImage={setImage} handleUpload={handleUpload}
            customPrompt={customPrompt} setCustomPrompt={setCustomPrompt} runVision={runVision} loading={loading} />
        )}
        {tab === 'code' && (
          <button onClick={runCodeReview} disabled={loading || files.length === 0}
            className="btn-gold w-full text-xs flex items-center justify-center gap-1.5">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanSearch className="w-3.5 h-3.5" />}
            Review {currentGame?.title || 'Game'} Code
          </button>
        )}
        {analysis && (
          <div className="text-[11px] text-studio-text-dim leading-relaxed whitespace-pre-wrap p-2.5 rounded-lg bg-studio-bg border border-studio-border max-h-96 overflow-y-auto">
            {analysis}
          </div>
        )}
        {!analysis && !loading && (
          <p className="text-[10px] text-studio-text-muted leading-relaxed">
            {tab === 'image'
              ? 'Screenshot your running game and upload it. The vision model critiques art style, UI, and suggests improvements.'

              : 'The AI reviews your generated game code for architecture, gameplay quality, and bugs.'}
          </p>
        )}
      </div>
    </div>
  );
}

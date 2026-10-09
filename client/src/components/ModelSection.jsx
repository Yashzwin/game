import React from 'react';
import { Cpu, Zap, Brain, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { SectionTitle, ModelRow } from './SettingsParts';

export default function ModelSection({
  models, liveModels, loadingLive, loadLive, selectedModel, setSelectedModel, customId, setCustomId,
}) {
  return (
    <>
      <section>
        <SectionTitle icon={Cpu} title="AI Model" />
        <p className="text-[11px] text-studio-text-dim mb-2">Choose the model that builds your games.</p>
        <div className="space-y-1.5">
          {Object.entries(models).map(([id, info]) => (
            <ModelRow key={id} id={id} info={info}
              active={selectedModel === id} onSelect={() => setSelectedModel(id)} />
          ))}
        </div>

        <div className="mt-3">
          <button onClick={loadLive} disabled={loadingLive}
            className="text-[11px] text-studio-gold hover:underline flex items-center gap-1.5">
            {loadingLive ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            {liveModels.length ? `Refresh live free models (${liveModels.length})` : 'Load all live free models from OpenRouter'}
          </button>
          {liveModels.length > 0 && (
            <div className="mt-2 max-h-44 overflow-y-auto space-y-1 rounded-md border border-studio-border p-1.5">
              {liveModels.map((m) => (
                <button key={m.id} onClick={() => setSelectedModel(m.id)}
                  className={clsx('w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-left transition-all',
                    selectedModel === m.id ? 'bg-studio-gold/15 text-studio-gold' : 'text-studio-text-dim hover:bg-studio-panel')}>
                  <span className="text-[11px] truncate">{m.name}</span>
                  <span className="text-[9px] font-mono shrink-0 flex items-center gap-1.5">
                    {m.vision && <span className="text-studio-gold">vision</span>}
                    {m.context ? `${Math.round(m.context / 1000)}K` : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3">
          <label className="text-[10px] uppercase tracking-widest text-studio-text-muted">Custom model ID</label>
          <div className="flex gap-1.5 mt-1">
            <input value={customId} onChange={(e) => setCustomId(e.target.value)}
              placeholder="e.g. vendor/model:free"
              className="input-studio flex-1 text-[11px] font-mono py-1.5" />
            <button onClick={() => { if (customId.trim()) setSelectedModel(customId.trim()); }}
              disabled={!customId.trim()} className="btn-gold text-[11px] px-3 disabled:opacity-30">Use</button>
          </div>
          <p className="text-[10px] text-studio-text-muted mt-1.5 font-mono break-all">Active: {selectedModel}</p>
        </div>
      </section>

      <div className="gold-divider" />

      <section>
        <SectionTitle icon={Brain} title="Model Guide" />
        <div className="text-[11px] text-studio-text-dim space-y-1.5 leading-relaxed">
          <p>⚡ <span className="text-studio-gold">North Mini Code</span> — best overall for game code, fastest.</p>
          <p>🧠 <span className="text-studio-gold">Nemotron 3 Ultra</span> — smartest for complex 3D logic, slower.</p>
          <p>🚀 <span className="text-studio-gold">Laguna XS</span> — balanced, great for iteration.</p>
          <p>👁️ <span className="text-studio-gold">Gemma 4 31B</span> — used automatically for Vision analysis.</p>
        </div>
      </section>
    </>
  );
}

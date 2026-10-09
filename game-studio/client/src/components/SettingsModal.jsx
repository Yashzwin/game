import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { aiApi } from '../utils/api';
import { X, Settings as SettingsIcon, Key, Cpu, Check, Loader2, Zap, Eye, Brain, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export default function SettingsModal() {
  const { settingsOpen, setSettingsOpen, selectedModel, setSelectedModel } = useStore();
  const [models, setModels] = useState({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (settingsOpen) {
      aiApi.getModels().then((d) => setModels(d.models || {})).catch(() => {});
    }
  }, [settingsOpen]);

  const testKey = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await aiApi.testKey();
      setTestResult(r);
    } catch (e) {
      setTestResult({ valid: false, message: e.message });
    }
    setTesting(false);
  };

  if (!settingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSettingsOpen(false)} />
      <div className="relative w-full max-w-lg bg-studio-surface border border-studio-border rounded-xl overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between px-4 py-3 border-b border-studio-border">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-studio-gold" />
            <span className="text-sm font-medium text-studio-text">Settings</span>
          </div>
          <button onClick={() => setSettingsOpen(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* API key */}
          <section>
            <SectionTitle icon={Key} title="OpenRouter API Key" />
            <p className="text-[11px] text-studio-text-dim mb-2 leading-relaxed">
              Add your key to <code className="px-1 py-0.5 rounded bg-studio-bg text-studio-gold font-mono">.env</code> as{' '}
              <code className="px-1 py-0.5 rounded bg-studio-bg text-studio-gold font-mono">OPENROUTER_API_KEY=sk-or-...</code>{' '}
              then restart the server.
            </p>
            <button onClick={testKey} disabled={testing}
              className="btn-gold text-xs flex items-center gap-1.5">
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              Test Connection
            </button>
            {testResult && (
              <div className={clsx('mt-2 flex items-center gap-2 text-[11px] px-2.5 py-2 rounded-md',
                testResult.valid ? 'bg-studio-success/10 text-studio-success' : 'bg-red-500/10 text-red-400')}>
                {testResult.valid ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {testResult.message}
              </div>
            )}
          </section>

          <div className="gold-divider" />

          {/* Model selection */}
          <section>
            <SectionTitle icon={Cpu} title="AI Model" />
            <p className="text-[11px] text-studio-text-dim mb-2">Choose the model that builds your games.</p>
            <div className="space-y-1.5">
              {Object.entries(models).map(([id, info]) => (
                <ModelRow key={id} id={id} info={info}
                  active={selectedModel === id} onSelect={() => setSelectedModel(id)} />
              ))}
            </div>
          </section>

          <div className="gold-divider" />

          <section>
            <SectionTitle icon={Brain} title="Model Guide" />
            <div className="text-[11px] text-studio-text-dim space-y-1.5 leading-relaxed">
              <p>⚡ <span className="text-studio-gold">North Mini Code</span> — best overall for game code, fastest.</p>
              <p>🧠 <span className="text-studio-gold">Nemotron Ultra</span> — smartest for complex 3D logic, but slow.</p>
              <p>🚀 <span className="text-studio-gold">Laguna XS</span> — balanced, great for iteration.</p>
              <p>👁️ <span className="text-studio-gold">Gemma 4 31B</span> — used automatically for Vision analysis.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-3.5 h-3.5 text-studio-gold" />
      <h4 className="text-xs font-medium text-studio-text uppercase tracking-wide">{title}</h4>
    </div>
  );
}

function ModelRow({ id, info, active, onSelect }) {
  return (
    <button onClick={onSelect}
      className={clsx('w-full flex items-center gap-3 px-3 py-2 rounded-md border transition-all text-left',
        active ? 'bg-studio-gold/10 border-studio-gold/40' : 'bg-studio-panel border-studio-border hover:border-studio-gold/25')}>
      <div className={clsx('w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
        active ? 'border-studio-gold' : 'border-studio-border')}>
        {active && <div className="w-2 h-2 rounded-full bg-studio-gold" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-studio-text truncate">{info.name}</span>
          {info.badge && <span className="text-[9px] text-studio-gold">{info.badge}</span>}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-studio-text-muted">
          <span>{info.params}</span><span>·</span><span>{info.speed}</span><span>·</span><span>{info.specialty}</span>
        </div>
      </div>
    </button>
  );
}

import React from 'react';
import {
  Key, Globe, Eye, EyeOff, Trash2, Save, Loader2, Check, Zap,
  AlertCircle, ExternalLink, FlaskConical,
} from 'lucide-react';
import clsx from 'clsx';
import { SectionTitle } from './SettingsParts';

export default function ConnectionSection({
  apiKey, setApiKey, showKey, setShowKey, baseUrl, setBaseUrl, config,
  onSave, saving, saved, onTest, testing, testResult, onClearKey, mock, setMock,
}) {
  return (
    <section>
      <SectionTitle icon={Key} title="OpenRouter Connection" />
      <p className="text-[11px] text-studio-text-dim mb-3 leading-relaxed">
        Paste your key once — it's saved on the server and remembered across restarts.
        Get a free key at{' '}
        <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer"
          className="text-studio-gold hover:underline inline-flex items-center gap-0.5">
          openrouter.ai/keys <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </p>

      <label className="text-[10px] uppercase tracking-widest text-studio-text-muted">API Key</label>
      <div className="relative mt-1">
        <input
          type={showKey ? 'text' : 'password'}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={config.hasKey ? `Saved: ${config.apiKeyMasked} — type to replace` : 'sk-or-v1-…'}
          autoComplete="off"
          spellCheck={false}
          className="input-studio w-full text-[11px] font-mono py-2 pr-20"
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          <button onClick={() => setShowKey(!showKey)} className="p-1.5 rounded text-studio-text-muted hover:text-studio-gold"
            title={showKey ? 'Hide' : 'Show'}>
            {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          {config.hasKey && (
            <button onClick={onClearKey} className="p-1.5 rounded text-studio-text-muted hover:text-red-400" title="Remove saved key">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <label className="text-[10px] uppercase tracking-widest text-studio-text-muted mt-3 block">
        Base URL <span className="normal-case tracking-normal opacity-70">(any OpenAI-compatible endpoint)</span>
      </label>
      <div className="relative mt-1">
        <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-studio-text-muted" />
        <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://openrouter.ai/api/v1" spellCheck={false}
          className="input-studio w-full text-[11px] font-mono py-2 pl-8" />
      </div>

      <button onClick={() => setMock(!mock)}
        className={clsx('mt-3 w-full flex items-center gap-2.5 px-3 py-2 rounded-md border transition-all text-left',
          mock ? 'bg-studio-gold/10 border-studio-gold/40' : 'bg-studio-panel border-studio-border hover:border-studio-gold/25')}>
        <div className={clsx('w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
          mock ? 'border-studio-gold' : 'border-studio-border')}>
          {mock && <div className="w-2 h-2 rounded-full bg-studio-gold" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 text-xs text-studio-text">
            <FlaskConical className="w-3 h-3 text-studio-gold" /> Demo Mode
          </div>
          <p className="text-[10px] text-studio-text-muted">Generate canned 2D/3D demo games — no API key needed.</p>
        </div>
      </button>

      <div className="flex gap-1.5 mt-3">
        <button onClick={onSave} disabled={saving}
          className={clsx('flex-1 flex items-center justify-center gap-1.5 text-xs rounded-md px-3 py-2 transition-all',
            saved ? 'bg-studio-success/20 text-studio-success' : 'btn-gold disabled:opacity-40')}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saved ? 'Saved' : 'Save'}
        </button>
        <button onClick={onTest} disabled={testing}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs rounded-md px-3 py-2 border border-studio-border text-studio-text-dim hover:text-studio-gold hover:border-studio-gold/40 transition-all disabled:opacity-40">
          {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          Test Connection
        </button>
      </div>

      {testResult && (
        <div className={clsx('mt-2 flex items-start gap-2 text-[11px] px-2.5 py-2 rounded-md',
          testResult.valid ? 'bg-studio-success/10 text-studio-success' : 'bg-red-500/10 text-red-400')}>
          {testResult.valid ? <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
          <div className="min-w-0">
            <div>{testResult.message}</div>
            {testResult.reply && <div className="text-[10px] opacity-70 font-mono truncate">reply: {testResult.reply}</div>}
          </div>
        </div>
      )}
    </section>
  );
}

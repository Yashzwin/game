import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { configApi, aiApi } from '../utils/api';
import { X, Settings as SettingsIcon } from 'lucide-react';
import clsx from 'clsx';
import ConnectionSection from './ConnectionSection';
import ModelSection from './ModelSection';

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';

export default function SettingsModal() {
  const { settingsOpen, setSettingsOpen, selectedModel, setSelectedModel, config, setConfig } = useStore();

  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [mock, setMock] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const [models, setModels] = useState({});
  const [liveModels, setLiveModels] = useState([]);
  const [loadingLive, setLoadingLive] = useState(false);
  const [customId, setCustomId] = useState('');

  useEffect(() => {
    if (!settingsOpen) return;
    configApi.get()
      .then((c) => {
        setConfig(c);
        setBaseUrl(c.baseUrl || DEFAULT_BASE_URL);
        setMock(!!c.mock);
        setApiKey('');
      })
      .catch(() => {});
    aiApi.getModels().then((d) => setModels(d.models || {})).catch(() => {});
  }, [settingsOpen]);

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      const payload = { baseUrl, mock };
      if (apiKey.trim()) payload.apiKey = apiKey.trim();
      const res = await configApi.save(payload);
      setConfig(res.config);
      setApiKey('');
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      setTestResult({ valid: false, message: e.message });
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      setTestResult(await configApi.test());
    } catch (e) {
      setTestResult({ valid: false, message: e.message });
    }
    setTesting(false);
  };

  const handleClearKey = async () => {
    const res = await configApi.clearKey();
    setConfig(res.config);
    setApiKey('');
    setTestResult(null);
  };

  const loadLive = async () => {
    setLoadingLive(true);
    try {
      const d = await aiApi.getModelsLive();
      setLiveModels(d.models || []);
    } catch (e) {
      console.error(e);
    }
    setLoadingLive(false);
  };

  if (!settingsOpen) return null;

  const configured = config.hasKey || config.mock;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSettingsOpen(false)} />
      <div className="relative w-full max-w-lg bg-studio-surface border border-studio-border rounded-xl overflow-hidden animate-slide-up flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-studio-border shrink-0">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-studio-gold" />
            <span className="text-sm font-medium text-studio-text">Settings</span>
            <span className={clsx('text-[10px] px-1.5 py-0.5 rounded',
              configured ? 'bg-studio-success/15 text-studio-success' : 'bg-studio-warning/15 text-studio-warning')}>
              {configured ? 'Ready' : 'Needs API key'}
            </span>
          </div>
          <button onClick={() => setSettingsOpen(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 space-y-5 overflow-y-auto">
          <ConnectionSection
            apiKey={apiKey} setApiKey={setApiKey} showKey={showKey} setShowKey={setShowKey}
            baseUrl={baseUrl} setBaseUrl={setBaseUrl} config={config}
            onSave={handleSave} saving={saving} saved={saved}
            onTest={handleTest} testing={testing} testResult={testResult}
            onClearKey={handleClearKey} mock={mock} setMock={setMock}
          />
          <div className="gold-divider" />
          <ModelSection
            models={models} liveModels={liveModels} loadingLive={loadingLive} loadLive={loadLive}
            selectedModel={selectedModel} setSelectedModel={setSelectedModel}
            customId={customId} setCustomId={setCustomId}
          />
        </div>
      </div>
    </div>
  );
}

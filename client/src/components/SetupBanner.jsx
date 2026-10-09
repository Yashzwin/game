import React from 'react';
import { useStore } from '../store/useStore';
import { KeyRound, ArrowRight, X } from 'lucide-react';

/**
 * Thin banner shown when no API key is configured and demo mode is off.
 * Points the user at Settings — everything is configured in the web UI.
 */
export default function SetupBanner() {
  const { config, configLoaded, setSettingsOpen, settingsOpen } = useStore();
  const [dismissed, setDismissed] = React.useState(false);

  if (!configLoaded || dismissed || settingsOpen) return null;
  if (config.hasKey || config.mock) return null;

  return (
    <div className="shrink-0 flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-studio-gold/15 via-studio-gold/5 to-transparent border-b border-studio-gold/25">
      <KeyRound className="w-4 h-4 text-studio-gold shrink-0" />
      <p className="flex-1 text-xs text-studio-text-dim">
        <span className="text-studio-text font-medium">Add your OpenRouter API key</span> to start
        generating games — or switch on <span className="text-studio-gold">Demo Mode</span> to try it
        without a key.
      </p>
      <button onClick={() => setSettingsOpen(true)}
        className="btn-gold text-[11px] px-3 py-1.5 flex items-center gap-1.5 shrink-0">
        Open Settings <ArrowRight className="w-3 h-3" />
      </button>
      <button onClick={() => setDismissed(true)} className="btn-ghost p-1 shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { useWebSocket } from './hooks/useWebSocket';
import { useStore } from './store/useStore';
import { gamesApi, configApi } from './utils/api';

import TopBar from './components/TopBar';
import ChatPanel from './components/ChatPanel';
import StudioPanel from './components/StudioPanel';
import HistoryDrawer from './components/HistoryDrawer';
import SettingsModal from './components/SettingsModal';
import WelcomeOverlay from './components/WelcomeOverlay';
import SetupBanner from './components/SetupBanner';

export default function App() {
  useWebSocket();
  const { games, setGames, currentGame, setConfig } = useStore();
  const [showWelcome, setShowWelcome] = useState(true);

  const loadGames = async () => {
    try {
      const { games } = await gamesApi.list();
      setGames(games);
    } catch (e) {
      console.error('Failed to load games', e);
    }
  };

  useEffect(() => {
    // Load saved connection settings (API key / base URL) from the server
    configApi.get().then(setConfig).catch(() => {});
    loadGames();
    const handler = () => loadGames();
    window.addEventListener('game-created', handler);
    return () => window.removeEventListener('game-created', handler);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-studio-bg film-grain overflow-hidden">
      <TopBar />

      <SetupBanner />

      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" autoSaveId="studio-layout">
          <Panel defaultSize={32} minSize={22} maxSize={50}>
            <ChatPanel />
          </Panel>

          <PanelResizeHandle className="w-1 bg-studio-border hover:bg-studio-gold/40 transition-colors" />

          <Panel defaultSize={68} minSize={40}>
            <StudioPanel />
          </Panel>
        </PanelGroup>
      </div>

      <StatusBar />

      <HistoryDrawer />
      <SettingsModal />
      {showWelcome && !currentGame && games.length === 0 && (
        <WelcomeOverlay onDismiss={() => setShowWelcome(false)} />
      )}
    </div>
  );
}

function StatusBar() {
  const { connected, games, generating, generationStatus } = useStore();
  return (
    <div className="h-6 flex items-center justify-between px-3 text-[11px] text-studio-text-muted border-t border-studio-border bg-studio-surface shrink-0">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              connected ? 'bg-studio-success' : 'bg-studio-error'
            }`}
          />
          {connected ? 'Connected' : 'Disconnected'}
        </span>
        <span className="text-studio-border">|</span>
        <span>🎮 {games.length} games</span>
      </div>
      <div className="flex items-center gap-3">
        {generating && (
          <span className="text-studio-gold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-studio-gold animate-pulse-gold" />
            {generationStatus || 'Generating…'}
          </span>
        )}
        <span className="text-studio-border">|</span>
        <span>AI Game Studio v1.0</span>
      </div>
    </div>
  );
}

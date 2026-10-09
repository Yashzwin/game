import React from 'react';
import { useStore } from '../store/useStore';
import { gamesApi } from '../utils/api';
import { X, Gamepad2, Trash2, Clock, Layers } from 'lucide-react';

export default function HistoryDrawer() {
  const { historyOpen, setHistoryOpen, games, setGames, setCurrentGame, setPreviewUrl, setActiveTab, setFiles, setActiveFile } = useStore();

  const openGame = async (game) => {
    try {
      const data = await gamesApi.get(game.id);
      setCurrentGame(data.meta);
      setFiles(data.files);
      if (data.files.length) setActiveFile(data.files[0].path);
      setPreviewUrl(`/games/${game.id}/${game.meta?.mainFile || game.mainFile}?t=${Date.now()}`);
      setActiveTab('preview');
      setHistoryOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const remove = async (e, game) => {
    e.stopPropagation();
    await gamesApi.remove(game.id);
    setGames(games.filter((g) => g.id !== game.id));
  };

  if (!historyOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setHistoryOpen(false)} />
      <div className="relative w-full max-w-md h-full bg-studio-surface border-l border-studio-border flex flex-col animate-slide-up">
        <div className="flex items-center justify-between px-4 py-3 border-b border-studio-border">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-studio-gold" />
            <span className="text-sm font-medium text-studio-text">Game Library</span>
            <span className="text-[10px] text-studio-text-muted font-mono">({games.length})</span>
          </div>
          <button onClick={() => setHistoryOpen(false)} className="btn-ghost p-1.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {games.length === 0 && (
            <div className="text-center py-16 text-studio-text-muted text-xs">
              No games yet. Create your first one!
            </div>
          )}
          {games.map((g) => (
            <div key={g.id} onClick={() => openGame(g)}
              className="group panel p-3 cursor-pointer hover:border-studio-gold/40 hover:bg-studio-gold/5 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-md bg-gradient-to-br from-studio-gold/25 to-studio-gold-dim/15 border border-studio-gold/25 flex items-center justify-center shrink-0">
                  <Gamepad2 className="w-4 h-4 text-studio-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-medium text-studio-text truncate">{g.title}</h4>
                    <button onClick={(e) => remove(e, g)}
                      className="opacity-0 group-hover:opacity-100 text-studio-text-muted hover:text-red-400 transition-all shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-studio-text-dim line-clamp-2 mt-0.5">{g.description}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-studio-text-muted">
                    <span className="px-1.5 py-0.5 rounded bg-studio-gold/10 text-studio-gold uppercase">{g.gameType}</span>
                    <span>{g.engine}</span>
                    <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{new Date(g.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

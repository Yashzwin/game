import { create } from 'zustand';

export const useStore = create((set, get) => ({
  // ---- Connection ----
  clientId: null,
  ws: null,
  connected: false,
  setClientId: (id) => set({ clientId: id }),
  setWs: (ws) => set({ ws }),
  setConnected: (c) => set({ connected: c }),

  // ---- Messages / Chat ----
  messages: [],
  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, { ...msg, id: crypto.randomUUID(), ts: Date.now() }] })),
  updateLastMessage: (patch) =>
    set((s) => {
      const msgs = [...s.messages];
      if (msgs.length === 0) return {};
      msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], ...patch };
      return { messages: msgs };
    }),
  clearMessages: () => set({ messages: [] }),

  // ---- Generation state ----
  generating: false,
  generationStatus: '',
  streamingText: '',
  thinkingText: '',
  showThinking: true,
  setGenerating: (g) => set({ generating: g }),
  setGenerationStatus: (s) => set({ generationStatus: s }),
  appendStreaming: (chunk) => set((s) => ({ streamingText: s.streamingText + chunk })),
  appendThinking: (chunk) => set((s) => ({ thinkingText: s.thinkingText + chunk })),
  resetStreaming: () => set({ streamingText: '', thinkingText: '' }),
  toggleThinking: () => set((s) => ({ showThinking: !s.showThinking })),

  // ---- Games ----
  games: [],
  currentGame: null,
  setGames: (games) => set({ games }),
  setCurrentGame: (game) => set({ currentGame: game }),

  // ---- Files ----
  files: [],
  activeFile: null,
  fileContents: {}, // path -> content
  dirtyFiles: new Set(),
  setFiles: (files) => set({ files }),
  setActiveFile: (path) => set({ activeFile: path }),
  setFileContent: (path, content) =>
    set((s) => ({ fileContents: { ...s.fileContents, [path]: content } })),
  markDirty: (path) =>
    set((s) => {
      const next = new Set(s.dirtyFiles);
      next.add(path);
      return { dirtyFiles: next };
    }),
  clearDirty: (path) =>
    set((s) => {
      const next = new Set(s.dirtyFiles);
      next.delete(path);
      return { dirtyFiles: next };
    }),

  // ---- Preview ----
  previewUrl: null,
  setPreviewUrl: (url) => set({ previewUrl: url }),

  // ---- Terminal ----
  terminalLines: [],
  addTerminalLine: (line) =>
    set((s) => ({ terminalLines: [...s.terminalLines, line].slice(-500) })),
  clearTerminal: () => set({ terminalLines: [] }),

  // ---- UI ----
  activeTab: 'preview', // preview | code | terminal
  setActiveTab: (tab) => set({ activeTab: tab }),
  settingsOpen: false,
  setSettingsOpen: (o) => set({ settingsOpen: o }),
  historyOpen: false,
  setHistoryOpen: (o) => set({ historyOpen: o }),

  // ---- Model settings ----
  selectedModel: 'cohere/north-mini-code:free',
  setSelectedModel: (m) => set({ selectedModel: m }),
}));

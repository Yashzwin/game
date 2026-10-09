import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { filesApi } from '../utils/api';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { Save, Loader2, Check, Code2 } from 'lucide-react';
import Editor from '@monaco-editor/react';
import clsx from 'clsx';
import FileTree, { fileIcon, langFor } from './FileTree';

export default function CodeWorkspace() {
  const {
    files, activeFile, currentGame,
    fileContents, setFileContent, dirtyFiles, markDirty, clearDirty,
  } = useStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    files.forEach((f) => {
      if (fileContents[f.path] === undefined) setFileContent(f.path, f.content);
    });
  }, [files]);

  const current = activeFile
    ? fileContents[activeFile] ?? files.find((f) => f.path === activeFile)?.content ?? ''
    : '';

  const handleSave = async () => {
    if (!currentGame || !activeFile) return;
    setSaving(true);
    try {
      await filesApi.save(currentGame.id, activeFile, current);
      clearDirty(activeFile);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      useStore.getState().setPreviewUrl(`/games/${currentGame.id}/${currentGame.mainFile}?t=${Date.now()}`);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeFile, current, currentGame]);

  if (!currentGame || files.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-center px-8">
        <div>
          <div className="w-16 h-16 rounded-2xl bg-studio-panel border border-studio-border flex items-center justify-center mx-auto mb-4">
            <Code2 className="w-8 h-8 text-studio-text-muted" />
          </div>
          <h3 className="text-sm font-medium text-studio-text-dim mb-1">No files yet</h3>
          <p className="text-xs text-studio-text-muted max-w-xs">Generate a game to see its source files here.</p>
        </div>
      </div>
    );
  }

  return (
    <PanelGroup direction="horizontal" autoSaveId="code-layout">
      <Panel defaultSize={20} minSize={12} maxSize={40}>
        <FileTree />
      </Panel>
      <PanelResizeHandle className="w-1 bg-studio-border hover:bg-studio-gold/40 transition-colors" />
      <Panel defaultSize={80}>
        <div className="h-full flex flex-col bg-studio-bg">
          <div className="h-9 flex items-center justify-between px-3 border-b border-studio-border bg-studio-surface shrink-0">
            <div className="flex items-center gap-2">
              {activeFile && fileIcon(activeFile)}
              <span className="text-xs text-studio-text-dim font-mono">{activeFile}</span>
              {activeFile && dirtyFiles.has(activeFile) && <span className="text-[10px] text-studio-gold">● unsaved</span>}
            </div>
            <button onClick={handleSave} disabled={saving || !activeFile || !dirtyFiles.has(activeFile)}
              className={clsx('flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] transition-all',
                saved ? 'bg-studio-success/20 text-studio-success' : 'btn-gold disabled:opacity-30')}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : saved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
              {saved ? 'Saved' : 'Save'}
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <Editor height="100%" language={langFor(activeFile || '')} theme="vs-dark" value={current}
              onChange={(val) => { if (activeFile) { setFileContent(activeFile, val ?? ''); markDirty(activeFile); } }}
              options={{
                fontSize: 13, fontFamily: 'JetBrains Mono, monospace', minimap: { enabled: false },
                scrollBeyondLastLine: false, padding: { top: 12 }, renderLineHighlight: 'gutter',
                smoothScrolling: true, cursorBlinking: 'smooth', tabSize: 2,
              }} />
          </div>
        </div>
      </Panel>
    </PanelGroup>
  );
}

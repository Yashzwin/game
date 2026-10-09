import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';

export function useWebSocket() {
  const wsRef = useRef(null);
  const reconnectTimeout = useRef(null);

  const {
    setWs, setConnected, setClientId,
    setGenerating, setGenerationStatus,
    appendStreaming, appendThinking, resetStreaming,
    addMessage, updateLastMessage,
    setPreviewUrl, setCurrentGame,
  } = useStore();

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // In dev, Vite proxies /api but WS goes direct to backend
    const wsUrl = `${protocol}//${window.location.hostname}:3001`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log('[WS] connected');
    };

    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      handleMessage(msg);
    };

    ws.onclose = () => {
      setConnected(false);
      // Attempt reconnect
      reconnectTimeout.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };

    function handleMessage(msg) {
      switch (msg.type) {
        case 'connected':
          setClientId(msg.id);
          setWs(wsRef.current);
          break;

        case 'generation_start':
          setGenerating(true);
          resetStreaming();
          setGenerationStatus(msg.message || 'Generating...');
          addMessage({ role: 'assistant', content: msg.message, kind: 'status', streaming: true });
          break;

        case 'thinking':
        case 'parsing':
        case 'saving':
          setGenerationStatus(msg.message);
          updateLastMessage({ content: msg.message, files: msg.files });
          break;

        case 'stream_chunk':
          appendStreaming(msg.chunk);
          break;

        case 'thinking_chunk':
          appendThinking(msg.chunk);
          break;

        case 'generation_complete':
          setGenerating(false);
          setGenerationStatus('');
          setCurrentGame(msg.meta);
          setPreviewUrl(msg.previewUrl ? msg.previewUrl + '?t=' + Date.now() : null);
          addMessage({
            role: 'assistant',
            content: msg.message,
            kind: 'complete',
            gameMeta: msg.meta,
            streaming: false,
          });
          // Refresh games list
          window.dispatchEvent(new CustomEvent('game-created', { detail: msg.meta }));
          break;

        case 'generation_error':
          setGenerating(false);
          setGenerationStatus('');
          addMessage({
            role: 'assistant',
            content: `❌ Error: ${msg.error}`,
            kind: 'error',
            rawResponse: msg.rawResponse,
            streaming: false,
          });
          break;

        default:
          break;
      }
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimeout.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { send };
}

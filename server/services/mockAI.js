import { build2D, build3D } from './mockGames.js';

// Mock AI — lets you try the full studio pipeline without an API key.
// Enable with MOCK_AI=1 in .env

export function mockGame(prompt) {
  const p = (prompt || '').toLowerCase();
  const is3D = /\b3d\b|three|webgl|space|shooter|racing|fps|orbit/.test(p);
  return is3D ? build3D() : build2D();
}

/**
 * Streams a canned game as if it came from the model.
 * Same interface as streamChat() so gameBuilder works unchanged.
 */
export function mockStreamChat({ messages, onChunk, onThinking }) {
  const lastUser = [...(messages || [])].reverse().find((m) => m.role === 'user');
  const data = mockGame(lastUser?.content || '');
  const text = JSON.stringify(data);
  const chunks = text.match(/[\s\S]{1,200}/g) || [];
  let i = 0;

  return new Promise((resolve) => {
    const timer = setInterval(() => {
      if (i < chunks.length) {
        onThinking?.('Planning game architecture… ');
        onChunk?.(chunks[i++]);
      } else {
        clearInterval(timer);
        resolve(text);
      }
    }, 10);
  });
}

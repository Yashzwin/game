import { streamChat, MODELS } from './openrouter.js';
import fsExtra from 'fs-extra';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GAMES_DIR = join(__dirname, '../games');

const GAME_SYSTEM_PROMPT = `You are an elite game developer AI in a professional game studio.
You create complete, playable, high-quality browser games.

RULES:
1. Generate COMPLETE, WORKING code. No placeholders, no TODOs.
2. For 2D games: Use Phaser 3 (CDN). Self-contained HTML with embedded JS/CSS.
3. For 3D games: Use Three.js (CDN). Self-contained HTML with embedded JS/CSS.
4. Output ONLY a JSON object — no markdown, no extra text:
{
  "gameType": "2d" | "3d",
  "engine": "phaser3" | "threejs" | "vanilla",
  "title": "Game Title",
  "description": "Short description",
  "genre": "platformer|rpg|shooter|puzzle|racing|strategy|arcade|adventure",
  "files": [
    { "path": "index.html", "content": "...full content..." },
    { "path": "game.js", "content": "...full content..." }
  ],
  "mainFile": "index.html",
  "controls": "WASD to move, Space to jump...",
  "features": ["feature1", "feature2"],
  "thinking": "Design decisions explanation"
}
5. index.html must be the main file, fully self-contained.
6. Games must be BEAUTIFUL: particles, smooth animations, procedural graphics.
7. Include pause menu, score display, game-over screen.
8. No external images/audio — use procedural graphics + Web Audio API.
9. 2D: Canvas 800x600. 3D: Full window WebGL.`;

function parseGameResponse(text) {
  try { return JSON.parse(text.trim()); } catch (_) {}
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) { try { return JSON.parse(jsonMatch[1].trim()); } catch (_) {} }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch (_) {}
  }
  throw new Error('Could not parse AI response as JSON game data');
}

async function saveGameFiles(gameId, gameData) {
  const gameDir = join(GAMES_DIR, gameId);
  await fsExtra.ensureDir(gameDir);
  for (const file of gameData.files) {
    const filePath = join(gameDir, file.path);
    await fsExtra.ensureDir(dirname(filePath));
    await fsExtra.writeFile(filePath, file.content, 'utf-8');
  }
  const meta = {
    id: gameId, title: gameData.title, description: gameData.description,
    genre: gameData.genre, gameType: gameData.gameType, engine: gameData.engine,
    controls: gameData.controls, features: gameData.features, thinking: gameData.thinking,
    mainFile: gameData.mainFile || 'index.html', createdAt: new Date().toISOString(),
    files: gameData.files.map((f) => f.path),
  };
  await fsExtra.writeFile(join(gameDir, 'meta.json'), JSON.stringify(meta, null, 2));
  return meta;
}

export async function generateGame({ prompt, gameId, conversationHistory = [], model, ws }) {
  const send = (data) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(data)); };
  send({ type: 'generation_start', gameId, message: '🎬 Starting game generation...' });
  let rawResponse = '';
  try {
    send({ type: 'thinking', message: '🧠 AI is designing your game...' });
    rawResponse = await streamChat({
      model: model || MODELS.codePrimary,
      systemPrompt: GAME_SYSTEM_PROMPT,
      messages: [
        ...conversationHistory,
        { role: 'user', content: `Create a complete, playable game: ${prompt}\n\nOutput ONLY the JSON object.` },
      ],
      onChunk: (chunk) => send({ type: 'stream_chunk', chunk }),
      onThinking: (t) => send({ type: 'thinking_chunk', chunk: t }),
    });
    send({ type: 'parsing', message: '📦 Parsing game files...' });
    const gameData = parseGameResponse(rawResponse);
    send({ type: 'saving', message: `💾 Saving ${gameData.files.length} files...`, files: gameData.files.map((f) => f.path) });
    const meta = await saveGameFiles(gameId, gameData);
    send({ type: 'generation_complete', gameId, meta, previewUrl: `/games/${gameId}/${meta.mainFile}`, message: `✅ "${gameData.title}" is ready!` });
    return { success: true, meta, gameData };
  } catch (error) {
    send({ type: 'generation_error', error: error.message, rawResponse: rawResponse.slice(0, 500) });
    throw error;
  }
}

export async function iterateGame({ gameId, instruction, model, ws }) {
  const send = (data) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(data)); };
  const gameDir = join(GAMES_DIR, gameId);
  const meta = await fsExtra.readJson(join(gameDir, 'meta.json'));
  const existingFiles = [];
  for (const fp of meta.files) {
    const content = await fsExtra.readFile(join(gameDir, fp), 'utf-8');
    existingFiles.push({ path: fp, content });
  }
  send({ type: 'generation_start', gameId, message: '🔄 Updating game...' });
  const iteratePrompt = `Existing game "${meta.title}":\n${existingFiles.map((f) => `\n--- ${f.path} ---\n${f.content.slice(0, 3000)}`).join('\n')}\n\nINSTRUCTION: ${instruction}\n\nOutput ONLY complete updated JSON.`;
  const rawResponse = await streamChat({
    model: model || MODELS.codePrimary, systemPrompt: GAME_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: iteratePrompt }],
    onChunk: (chunk) => send({ type: 'stream_chunk', chunk }),
    onThinking: (t) => send({ type: 'thinking_chunk', chunk: t }),
  });
  const gameData = parseGameResponse(rawResponse);
  const updatedMeta = await saveGameFiles(gameId, gameData);
  send({ type: 'generation_complete', gameId, meta: updatedMeta, previewUrl: `/games/${gameId}/${updatedMeta.mainFile}`, message: `✅ Game updated!` });
  return { success: true, meta: updatedMeta };
}

export async function listGames() {
  await fsExtra.ensureDir(GAMES_DIR);
  const dirs = await fsExtra.readdir(GAMES_DIR);
  const games = [];
  for (const dir of dirs) {
    const metaPath = join(GAMES_DIR, dir, 'meta.json');
    if (await fsExtra.pathExists(metaPath)) games.push(await fsExtra.readJson(metaPath));
  }
  return games.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getGameFiles(gameId) {
  const gameDir = join(GAMES_DIR, gameId);
  const meta = await fsExtra.readJson(join(gameDir, 'meta.json'));
  const files = [];
  for (const fp of meta.files) {
    const content = await fsExtra.readFile(join(gameDir, fp), 'utf-8');
    files.push({ path: fp, content });
  }
  return { meta, files };
}

export async function updateGameFile(gameId, filePath, content) {
  const gameDir = join(GAMES_DIR, gameId);
  const fullPath = join(gameDir, filePath);
  await fsExtra.ensureDir(dirname(fullPath));
  await fsExtra.writeFile(fullPath, content, 'utf-8');
  const metaPath = join(gameDir, 'meta.json');
  const meta = await fsExtra.readJson(metaPath);
  if (!meta.files.includes(filePath)) {
    meta.files.push(filePath);
    await fsExtra.writeFile(metaPath, JSON.stringify(meta, null, 2));
  }
  return { success: true };
}

export async function deleteGame(gameId) {
  await fsExtra.remove(join(GAMES_DIR, gameId));
  return { success: true };
}

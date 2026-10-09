import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';

import aiRoutes from './routes/ai.js';
import gamesRoutes from './routes/games.js';
import filesRoutes from './routes/files.js';
import configRoutes from './routes/config.js';
import { startSession, writeToSession, runCommand, killSession } from './services/terminal.js';
import { getConfig } from './services/config.js';
import { register, unregister } from './services/hub.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GAMES_DIR = join(__dirname, 'games');
if (!existsSync(GAMES_DIR)) mkdirSync(GAMES_DIR, { recursive: true });

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use('/games', express.static(GAMES_DIR));

app.use('/api/ai', aiRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/config', configRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', gamesDir: GAMES_DIR });
});

// Serve built client (production) — same-origin previews
const CLIENT_DIST = join(__dirname, '../client/dist');
if (existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/games')) return res.status(404).end();
    res.sendFile(join(CLIENT_DIST, 'index.html'));
  });
  console.log('📦 Serving built client from', CLIENT_DIST);
}

const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  const id = randomUUID();
  register(id, ws);
  console.log(`[WS] Client connected: ${id}`);

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      switch (msg.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        case 'terminal_start':
          startSession(id, ws);
          break;
        case 'terminal_input':
          writeToSession(id, msg.data);
          break;
        case 'terminal_command':
          runCommand(id, ws, msg.command);
          break;
        case 'terminal_kill':
          killSession(id);
          break;
        default:
          break;
      }
    } catch (e) {
      console.error('[WS] message error', e.message);
    }
  });

  ws.on('close', () => {
    killSession(id);
    unregister(id);
    console.log(`[WS] Client disconnected: ${id}`);
  });

  ws.send(JSON.stringify({ type: 'connected', id }));
});

export { wss, GAMES_DIR };

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🎬 AI Game Studio Server running on http://localhost:${PORT}`);
  console.log(`📁 Games directory: ${GAMES_DIR}`);
  const c = getConfig();
  const mode = c.mock ? '🎭 demo (MOCK_AI)' : c.apiKey ? '✅ set' : '❌ not set — open Settings in the web UI';
  console.log(`🔑 API key: ${mode}`);
  console.log(`🌐 Base URL: ${c.baseUrl}`);
  console.log(`\n👉 Open http://localhost:${PORT} and configure everything in Settings.\n`);
});

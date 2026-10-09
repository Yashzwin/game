import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { existsSync, mkdirSync } from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GAMES_DIR = join(__dirname, 'games');
if (!existsSync(GAMES_DIR)) mkdirSync(GAMES_DIR, { recursive: true });

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

// Serve generated games statically
app.use('/games', express.static(GAMES_DIR));

// Routes
import aiRoutes from './routes/ai.js';
import gamesRoutes from './routes/games.js';
import filesRoutes from './routes/files.js';

app.use('/api/ai', aiRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/files', filesRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', gamesDir: GAMES_DIR });
});

// HTTP + WebSocket server
const server = createServer(app);
const wss = new WebSocketServer({ server });

// WebSocket for terminal + streaming
const clients = new Map();

wss.on('connection', (ws, req) => {
  const id = crypto.randomUUID();
  clients.set(id, ws);
  console.log(`[WS] Client connected: ${id}`);

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (e) {
      console.error('[WS] message error', e);
    }
  });

  ws.on('close', () => {
    clients.delete(id);
    console.log(`[WS] Client disconnected: ${id}`);
  });

  ws.send(JSON.stringify({ type: 'connected', id }));
});

// Export wss for use in routes
export { wss, clients };

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🎬 AI Game Studio Server running on http://localhost:${PORT}`);
  console.log(`📁 Games directory: ${GAMES_DIR}`);
  console.log(`🔑 OpenRouter key: ${process.env.OPENROUTER_API_KEY ? '✅ set' : '❌ missing — add to .env'}\n`);
});

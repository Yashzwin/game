import { Router } from 'express';
import { generateGame, iterateGame } from '../services/gameBuilder.js';
import { chat, analyzeImage, MODEL_INFO, MODELS, fetchFreeModels } from '../services/openrouter.js';
import { getConfig } from '../services/config.js';
import { getClient } from '../services/hub.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get available models info
router.get('/models', (req, res) => {
  res.json({ models: MODEL_INFO, defaults: MODELS });
});

// Live list of free models straight from OpenRouter
router.get('/models-live', async (req, res) => {
  try {
    const models = await fetchFreeModels();
    res.json({ models });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate a new game — uses WebSocket for streaming
router.post('/generate', async (req, res) => {
  const { prompt, clientId, model, conversationHistory } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });
  const cfg = getConfig();
  if (!cfg.apiKey && !cfg.mock) {
    return res.status(400).json({
      error: 'No API key configured. Open Settings in the studio and paste your OpenRouter API key.',
    });
  }

  const gameId = uuidv4();
  const ws = getClient(clientId);

  // Start async generation
  generateGame({ prompt, gameId, model, conversationHistory: conversationHistory || [], ws })
    .catch((err) => console.error('[Generate] Error:', err.message));

  res.json({ gameId, message: 'Generation started, watch WebSocket for progress' });
});

// Iterate on existing game
router.post('/iterate/:gameId', async (req, res) => {
  const { gameId } = req.params;
  const { instruction, clientId, model } = req.body;
  if (!instruction) return res.status(400).json({ error: 'instruction is required' });
null
  const cfg = getConfig();
  if (!cfg.apiKey && !cfg.mock) {
    return res.status(400).json({ error: 'No API key configured. Add it in Settings.' });
  }

  const ws = getClient(clientId);
  iterateGame({ gameId, instruction, model, ws })
    .catch((err) => console.error('[Iterate] Error:', err.message));

  res.json({ gameId, message: 'Update started, watch WebSocket for progress' });
});

// Chat with AI (non-game, general studio assistant)
router.post('/chat', async (req, res) => {
  const { messages, model, systemPrompt } = req.body;
  if (!messages) return res.status(400).json({ error: 'messages required' });
  try {
    const response = await chat({ messages, model, systemPrompt });
    res.json({ response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vision analysis
router.post('/vision', async (req, res) => {
  const { imageUrl, imageBase64, prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });
  try {
    const analysis = await analyzeImage({ imageUrl, imageBase64, prompt });
    res.json({ analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test API key (legacy alias — prefer POST /api/config/test)
router.get('/test-key', async (req, res) => {
  const cfg = getConfig();
  if (cfg.mock) return res.json({ valid: true, mock: true, message: 'Demo mode is ON.' });
  if (!cfg.apiKey) return res.json({ valid: false, message: 'No API key set. Add it in Settings.' });
  try {
    await chat({ messages: [{ role: 'user', content: 'Say "OK" in one word.' }], model: MODELS.chatFast });
    res.json({ valid: true, message: 'API key is working!' });
  } catch (err) {
    res.json({ valid: false, message: err.response?.data?.error?.message || err.message });
  }
});

export default router;

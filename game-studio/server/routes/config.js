import { Router } from 'express';
import { getConfig, saveConfig, publicConfig } from '../services/config.js';
import { chat, MODELS } from '../services/openrouter.js';

const router = Router();

// Get current config (API key is masked — never returned in full)
router.get('/', (req, res) => {
  res.json(publicConfig());
});

// Save config from the web Settings panel
router.post('/', (req, res) => {
  const { apiKey, baseUrl, mock } = req.body || {};
  try {
    saveConfig({ apiKey, baseUrl, mock });
    res.json({ success: true, config: publicConfig() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Test the currently-saved credentials
router.post('/test', async (req, res) => {
  const cfg = getConfig();

  if (cfg.mock) {
    return res.json({ valid: true, mock: true, message: 'Demo mode is ON — no API key needed.' });
  }
  if (!cfg.apiKey) {
    return res.json({ valid: false, message: 'No API key saved yet. Paste one and hit Save.' });
  }

  try {
    const started = Date.now();
    const reply = await chat({
      messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
      model: MODELS.chatFast,
    });
    res.json({
      valid: true,
      message: `Connected in ${Date.now() - started}ms`,
      reply: (reply || '').slice(0, 60),
      baseUrl: cfg.baseUrl,
    });
  } catch (err) {
    const detail =
      err.response?.data?.error?.message ||
      err.response?.data?.message ||
      err.message;
    res.json({
      valid: false,
      message: detail,
      status: err.response?.status,
      baseUrl: cfg.baseUrl,
    });
  }
});

// Clear the saved key
router.delete('/key', (req, res) => {
  saveConfig({ apiKey: '' });
  res.json({ success: true, config: publicConfig() });
});

export default router;

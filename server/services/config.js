import fsExtra from 'fs-extra';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CONFIG_PATH = join(__dirname, '../config.json');

export const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';

let cache = null;

/**
 * Load runtime config.
 * Priority: server/config.json (set from the web UI) → .env → defaults.
 */
export function getConfig() {
  if (cache) return cache;

  let file = {};
  try {
    if (fsExtra.existsSync(CONFIG_PATH)) file = fsExtra.readJsonSync(CONFIG_PATH);
  } catch (e) {
    console.warn('[config] could not read config.json:', e.message);
  }

  cache = {
    apiKey: file.apiKey || process.env.OPENROUTER_API_KEY || '',
    baseUrl: (file.baseUrl || process.env.OPENROUTER_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ''),
    mock: file.mock === true || process.env.MOCK_AI === '1',
  };
  return cache;
}

/**
 * Persist config (called from the web Settings panel).
 * Only writes the fields provided.
 */
export function saveConfig(patch = {}) {
  const current = getConfig();
  const next = {
    apiKey: patch.apiKey !== undefined ? String(patch.apiKey).trim() : current.apiKey,
    baseUrl: (patch.baseUrl !== undefined ? String(patch.baseUrl).trim() : current.baseUrl).replace(/\/+$/, '') || DEFAULT_BASE_URL,
    mock: patch.mock !== undefined ? !!patch.mock : current.mock,
  };
  cache = next;
  fsExtra.writeJsonSync(CONFIG_PATH, next, { spaces: 2 });
  return next;
}

/** Mask a key for display: sk-or-v1-…a1b2 */
export function maskKey(key) {
  if (!key) return '';
  if (key.length <= 12) return '••••';
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

/** Public-safe view of the config (never leaks the full key). */
export function publicConfig() {
  const c = getConfig();
  return {
    hasKey: !!c.apiKey,
    apiKeyMasked: maskKey(c.apiKey),
    baseUrl: c.baseUrl,
    mock: c.mock,
    configPath: CONFIG_PATH,
  };
}

export { CONFIG_PATH };

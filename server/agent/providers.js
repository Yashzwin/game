import fsExtra from 'fs-extra';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Provider registry.
 *
 * OpenRouter, Poolside and Hugging Face all expose an OpenAI-compatible
 * `/chat/completions` endpoint that accepts `tools` and returns `tool_calls`,
 * so a single client in `llm.js` can drive all three.
 *
 *   OpenRouter   https://openrouter.ai/api/v1        OPENROUTER_API_KEY
 *   Poolside     https://inference.poolside.ai/v1    POOLSIDE_API_KEY
 *   Hugging Face https://router.huggingface.co/v1    HF_TOKEN
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CONFIG_PATH = join(__dirname, '../agent-config.json');

export const PROVIDERS = {
  openrouter: {
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    envKeys: ['OPENROUTER_API_KEY'],
    defaultModel: 'cohere/north-mini-code:free',
    headers: { 'HTTP-Referer': 'http://localhost:3001', 'X-Title': 'OpenAgent Studio' },
    models: [
      'cohere/north-mini-code:free',
      'poolside/laguna-s-2.1:free',
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'deepseek/deepseek-chat-v3-0324:free',
    ],
    docs: 'https://openrouter.ai/keys',
  },
  poolside: {
    label: 'Poolside',
    baseUrl: 'https://inference.poolside.ai/v1',
    envKeys: ['POOLSIDE_API_KEY'],
    defaultModel: 'poolside/laguna-s-2.1',
    headers: {},
    models: ['poolside/laguna-s-2.1', 'poolside/laguna-xs-2.1', 'poolside/laguna-m-2.1'],
    docs: 'https://docs.poolside.ai',
  },
  huggingface: {
    label: 'Hugging Face',
    baseUrl: 'https://router.huggingface.co/v1',
    envKeys: ['HF_TOKEN', 'HUGGINGFACE_API_KEY', 'HUGGINGFACEHUB_API_TOKEN'],
    defaultModel: 'deepseek-ai/DeepSeek-V3-0324',
    headers: {},
    models: [
      'deepseek-ai/DeepSeek-V3-0324',
      'Qwen/Qwen2.5-Coder-32B-Instruct',
      'meta-llama/Llama-3.3-70B-Instruct',
    ],
    docs: 'https://huggingface.co/settings/tokens',
  },
};

export const DEFAULT_PROVIDER = 'openrouter';

/** Read a key from the saved config, falling back to environment variables. */
function readEnvKey(envKeys) {
  for (const name of envKeys) {
    if (process.env[name]) return process.env[name];
  }
  return '';
}

/** Load persisted agent config (provider, per-provider keys, model overrides). */
export function loadAgentConfig() {
  let file = {};
  try {
    if (fsExtra.existsSync(CONFIG_PATH)) file = fsExtra.readJsonSync(CONFIG_PATH);
  } catch (e) {
    console.warn('[agent-config] could not read agent-config.json:', e.message);
  }

  const keys = {};
  const models = {};
  for (const name of Object.keys(PROVIDERS)) {
    const saved = file.keys?.[name];
    keys[name] = saved !== undefined && saved !== '' ? String(saved) : readEnvKey(PROVIDERS[name].envKeys);
    models[name] = file.models?.[name] || PROVIDERS[name].defaultModel;
  }

  const provider = PROVIDERS[file.provider] ? file.provider : DEFAULT_PROVIDER;
  return { provider, keys, models };
}

/** Persist a config patch (only the fields provided are changed). */
export function saveAgentConfig(patch = {}) {
  const current = loadAgentConfig();
  const next = {
    provider: PROVIDERS[patch.provider] ? patch.provider : current.provider,
    keys: { ...current.keys },
    models: { ...current.models },
  };
  if (patch.keys && typeof patch.keys === 'object') {
    for (const [name, value] of Object.entries(patch.keys)) {
      if (PROVIDERS[name] && typeof value === 'string') next.keys[name] = value.trim();
    }
  }
  if (patch.models && typeof patch.models === 'object') {
    for (const [name, value] of Object.entries(patch.models)) {
      if (PROVIDERS[name] && typeof value === 'string' && value.trim()) {
        next.models[name] = value.trim();
      }
    }
  }
  // Env-provided keys are not written back to disk — only explicitly saved ones are.
  const toPersist = {
    provider: next.provider,
    keys: Object.fromEntries(
      Object.entries(next.keys).filter(([name, key]) => key && key !== readEnvKey(PROVIDERS[name].envKeys))
    ),
    models: next.models,
  };
  fsExtra.writeJsonSync(CONFIG_PATH, toPersist, { spaces: 2 });
  return next;
}

/** Mask a secret for display: sk-or-v1-…a1b2 */
export function maskKey(key) {
  if (!key) return '';
  if (key.length <= 12) return '••••';
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

/** Public-safe view — never leaks a full key to the browser. */
export function publicAgentConfig() {
  const cfg = loadAgentConfig();
  return {
    provider: cfg.provider,
    models: cfg.models,
    providers: Object.entries(PROVIDERS).map(([name, p]) => ({
      name,
      label: p.label,
      baseUrl: p.baseUrl,
      defaultModel: p.defaultModel,
      models: p.models,
      docs: p.docs,
      hasKey: !!cfg.keys[name],
      keyMasked: maskKey(cfg.keys[name]),
      active: name === cfg.provider,
    })),
  };
}

/** Resolve everything needed to make a request for one provider. */
export function resolveProvider(name, baseUrlOverride) {
  const cfg = loadAgentConfig();
  const providerName = PROVIDERS[name] ? name : cfg.provider;
  const p = PROVIDERS[providerName];
  return {
    name: providerName,
    label: p.label,
    baseUrl: (baseUrlOverride || p.baseUrl).replace(/\/+$/, ''),
    apiKey: cfg.keys[providerName],
    model: cfg.models[providerName] || p.defaultModel,
    headers: p.headers,
  };
}

export { CONFIG_PATH };

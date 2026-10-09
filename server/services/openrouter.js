import axios from 'axios';
import { mockStreamChat } from './mockAI.js';
import { getConfig } from './config.js';



// Model roster — best free models for each task (verified OpenRouter IDs)
export const MODELS = {
  codePrimary: 'cohere/north-mini-code:free',
  codeHeavy: 'nvidia/nemotron-3-ultra-550b-a55b:free',
  chatFast: 'poolside/laguna-xs-2.1:free',
  vision: 'google/gemma-4-31b-it:free',
  safety: 'nvidia/nemotron-3.5-content-safety:free',
};

export const MODEL_INFO = {
  'cohere/north-mini-code:free': {
    name: 'Cohere: North Mini Code', params: '157B', context: '256K',
    specialty: 'Code generation', badge: 'Primary', recommended: true,
  },
  'nvidia/nemotron-3-ultra-550b-a55b:free': {
    name: 'NVIDIA: Nemotron 3 Ultra', params: '6.9T MoE', context: '1M',
    specialty: 'Deep reasoning', badge: 'Deep Think',
  },
  'poolside/laguna-xs-2.1:free': {
    name: 'Poolside: Laguna XS 2.1', params: '84B', context: '262K',
    specialty: 'Code + chat', badge: 'Fast',
  },
  'google/gemma-4-31b-it:free': {
    name: 'Google: Gemma 4 31B', params: '31B', context: '262K',
    specialty: 'Multimodal vision', badge: 'Vision', vision: true,
  },
  'nvidia/nemotron-3-super-120b-a12b:free': {
    name: 'NVIDIA: Nemotron 3 Super', params: '120B', context: '262K',
    specialty: 'Balanced', badge: 'Balanced',
  },
  'thinkingmachines/inkling:free': {
    name: 'Thinking Machines: Inkling', params: 'MoE', context: '1M',
    specialty: 'Long context', badge: '1M ctx',
  },
  'nvidia/nemotron-3.5-lightning:free': {
    name: 'NVIDIA: Nemotron 3.5 Lightning', params: 'MoE', context: '1M',
    specialty: 'Fast + long ctx', badge: 'Lightning',
  },
  'dots-studio/dots-3-note-preview:free': {
    name: 'Dots Studio: Dots3-Note', params: 'MoE', context: '512K',
    specialty: 'General', badge: 'Preview',
  },
};

/**
 * Fetch the live list of free models from OpenRouter.
 */
export async function fetchFreeModels() {
  const cfg = getConfig();
  const res = await axios.get(`${cfg.baseUrl}/models`, { timeout: 20000 });
  const models = res.data?.data || [];
  return models
    .filter((m) => m.pricing && Number(m.pricing.prompt) === 0 && Number(m.pricing.completion) === 0)
    .map((m) => ({
      id: m.id,
      name: m.name,
      context: m.context_length,
      modality: m.architecture?.modality,
      vision: (m.architecture?.input_modalities || []).includes('image'),
    }))
    .sort((a, b) => (b.context || 0) - (a.context || 0));
}

/**
 * Stream a chat completion from OpenRouter.
 * Calls `onChunk(text)` for each streamed token, returns full text.
 */
export async function streamChat({ messages, model, onChunk, onThinking, systemPrompt }) {
  const cfg = getConfig();

  if (cfg.mock) {
    return mockStreamChat({ messages, onChunk, onThinking });
  }

  const apiKey = cfg.apiKey;
  if (!apiKey) {
    throw new Error('No API key set. Open Settings in the studio and paste your OpenRouter API key.');
  }

  const chosenModel = model || MODELS.codePrimary;

  const body = {
    model: chosenModel,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages,
    ],
    stream: true,
    temperature: 0.3,
    max_tokens: 16000,
  };

  const response = await axios.post(`${cfg.baseUrl}/chat/completions`, body, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'AI Game Studio',
    },
    responseType: 'stream',
    timeout: 120000,
  });

  let fullText = '';
  let buffer = '';

  return new Promise((resolve, reject) => {
    response.data.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          if (delta?.reasoning && onThinking) {
            onThinking(delta.reasoning);
          }
          if (delta?.content) {
            fullText += delta.content;
            if (onChunk) onChunk(delta.content);
          }
        } catch (_) {}
      }
    });

    response.data.on('end', () => resolve(fullText));
    response.data.on('error', reject);
  });
}

/**
 * Non-streaming chat (for quick responses)
 */
export async function chat({ messages, model, systemPrompt }) {
  const cfg = getConfig();
  const apiKey = cfg.apiKey;
  if (!apiKey) throw new Error('No API key set. Add it in Settings.');

  const res = await axios.post(
    `${cfg.baseUrl}/chat/completions`,
    {
      model: model || MODELS.chatFast,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        ...messages,
      ],
      temperature: 0.3,
      max_tokens: 8000,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'AI Game Studio',
      },
      timeout: 60000,
    }
  );

  return res.data.choices[0].message.content;
}

/**
 * Vision analysis — send an image (base64 or URL) + prompt
 */
export async function analyzeImage({ imageUrl, imageBase64, prompt }) {
  const cfg = getConfig();
  const apiKey = cfg.apiKey;
  if (!apiKey) throw new Error('No API key set. Add it in Settings.');

  const imageContent = imageBase64
    ? { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } }
    : { type: 'image_url', image_url: { url: imageUrl } };

  const res = await axios.post(
    `${cfg.baseUrl}/chat/completions`,
    {
      model: MODELS.vision,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: prompt }, imageContent],
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'AI Game Studio',
      },
      timeout: 60000,
    }
  );

  return res.data.choices[0].message.content;
}

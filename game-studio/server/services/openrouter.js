import axios from 'axios';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

// Model roster — best free models for each task
export const MODELS = {
  // Primary code gen: Cohere North Mini Code — fastest code model
  codePrimary: 'cohere/north-mini-code',
  // Heavy logic fallback: Nemotron Ultra (huge but slow)
  codeHeavy: 'nvidia/nemotron-3-ultra',
  // Fast chat: Poolside Laguna — code-focused
  chatFast: 'poolside/laguna-xs-2.1',
  // Vision: Gemma 4 31B (multimodal)
  vision: 'google/gemma-4-31b-it',
  // Content safety check
  safety: 'nvidia/nemotron-3.5-content-safety',
};

export const MODEL_INFO = {
  'cohere/north-mini-code': {
    name: 'Cohere: North Mini Code',
    params: '157B',
    speed: '83 t/s',
    specialty: 'Code generation',
    badge: '⚡ Primary',
  },
  'nvidia/nemotron-3-ultra': {
    name: 'NVIDIA: Nemotron Ultra',
    params: '6.91T',
    speed: '23 t/s',
    specialty: 'Complex reasoning',
    badge: '🧠 Deep Think',
  },
  'poolside/laguna-xs-2.1': {
    name: 'Poolside: Laguna XS 2.1',
    params: '84.4B',
    speed: '44 t/s',
    specialty: 'Code + chat',
    badge: '🚀 Fast',
  },
  'google/gemma-4-31b-it': {
    name: 'Google: Gemma 4 31B',
    params: '558M MoE',
    speed: '25 t/s',
    specialty: 'Multimodal vision',
    badge: '👁️ Vision',
  },
};

/**
 * Stream a chat completion from OpenRouter.
 * Calls `onChunk(text)` for each streamed token, returns full text.
 */
export async function streamChat({ messages, model, onChunk, onThinking, systemPrompt }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set in .env');

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

  const response = await axios.post(`${OPENROUTER_BASE}/chat/completions`, body, {
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
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set in .env');

  const res = await axios.post(
    `${OPENROUTER_BASE}/chat/completions`,
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
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set in .env');

  const imageContent = imageBase64
    ? { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } }
    : { type: 'image_url', image_url: { url: imageUrl } };

  const res = await axios.post(
    `${OPENROUTER_BASE}/chat/completions`,
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

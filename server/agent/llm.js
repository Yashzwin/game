import axios from 'axios';
import { resolveProvider } from './providers.js';
import { KNOWN_TOOLS } from './tools.js';

/**
 * The single OpenAI-compatible client used by every provider.
 *
 * Handles three realities of working with free/open models:
 *   1. Native `tool_calls` (OpenRouter / Poolside / HF all support this).
 *   2. Streamed `tool_calls` where arguments arrive as partial JSON strings.
 *   3. Models that ignore the tools array and print a call as text — we parse
 *      that back into a tool call so the loop still works.
 */

/** Merge streamed tool-call deltas (which arrive split by `index`). */
function mergeToolCallDelta(acc, delta) {
  const idx = delta.index ?? acc.length;
  if (!acc[idx]) acc[idx] = { id: '', name: '', arguments: '' };
  const slot = acc[idx];
  if (delta.id) slot.id = delta.id;
  if (delta.function?.name) slot.name = delta.function.name;
  if (delta.function?.arguments) slot.arguments += delta.function.arguments;
  return acc;
}

/** Best-effort JSON parse of a tool-call arguments string. */
function safeParseArgs(raw) {
  if (!raw || typeof raw !== 'string') return {};
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch (_) {}
  // Some models wrap arguments in a fenced block or add prose around the JSON.
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch (_) {}
  }
  return {};
}

/**
 * Recover tool calls that a model emitted as text instead of using native tools.
 * Understands ```tool fences, <tool_call> tags, and bare {"name","arguments"} JSON.
 */
export function parseTextToolCalls(text) {
  if (!text || typeof text !== 'string') return [];
  const calls = [];
  const push = (obj) => {
    const name = obj?.name || obj?.tool || obj?.function?.name;
    if (!name || !KNOWN_TOOLS.has(name)) return;
    const args = obj.arguments ?? obj.args ?? obj.function?.arguments ?? {};
    calls.push({
      id: `text_call_${calls.length + 1}`,
      name,
      source: 'text',
      arguments: typeof args === 'string' ? safeParseArgs(args) : args || {},
    });
  };

  for (const match of text.matchAll(/```(?:tool|json)?\s*([\s\S]*?)```/g)) {
    const body = match[1].trim();
    try {
      const parsed = JSON.parse(body);
      Array.isArray(parsed) ? parsed.forEach(push) : push(parsed);
    } catch (_) {}
  }
  for (const match of text.matchAll(/<tool_call>\s*([\s\S]*?)<\/tool_call>/g)) {
    try {
      push(JSON.parse(match[1].trim()));
    } catch (_) {}
  }
  if (calls.length === 0) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        push(JSON.parse(text.slice(start, end + 1)));
      } catch (_) {}
    }
  }
  return calls;
}

/** Normalise a native tool_call from a non-streamed response. */
function normalizeNativeToolCalls(message) {
  return (message?.tool_calls || []).map((call, i) => ({
    id: call.id || `call_${i + 1}`,
    name: call.function?.name || '',
    source: 'native',
    arguments: safeParseArgs(call.function?.arguments),
  }));
}

function buildRequestBody({ model, messages, tools, temperature, maxTokens, stream }) {
  const body = {
    model,
    messages,
    temperature: temperature ?? 0.2,
    max_tokens: maxTokens ?? 16000,
    stream: !!stream,
  };
  if (tools && tools.length) {
    body.tools = tools;
    body.tool_choice = 'auto';
    body.parallel_tool_calls = false; // one action per step keeps the loop deterministic
  }
  return body;
}

function authHeaders(provider) {
  return {
    Authorization: `Bearer ${provider.apiKey}`,
    'Content-Type': 'application/json',
    ...provider.headers,
  };
}

function requireKey(provider) {
  if (!provider.apiKey) {
    throw new Error(
      `No API key for ${provider.label}. Add it in the studio Settings panel, or set ` +
        `the environment variable for that provider.`
    );
  }
}

/** Non-streaming completion. Simple and the most reliable across providers. */
export async function chatCompletion({
  provider,
  model,
  messages,
  tools,
  temperature,
  maxTokens,
  baseUrl,
  signal,
}) {
  const p = resolveProvider(provider, baseUrl);
  requireKey(p);

  const res = await axios.post(
    `${p.baseUrl}/chat/completions`,
    buildRequestBody({ model: model || p.model, messages, tools, temperature, maxTokens, stream: false }),
    { headers: authHeaders(p), timeout: 180000, signal }
  );

  const choice = res.data?.choices?.[0] || {};
  const message = choice.message || {};
  const native = normalizeNativeToolCalls(message);
  const text = typeof message.content === 'string' ? message.content : '';

  return {
    content: text,
    reasoning: message.reasoning_content || message.reasoning || '',
    toolCalls: native.length ? native : parseTextToolCalls(text),
    finishReason: choice.finish_reason || 'stop',
    usage: res.data?.usage || null,
    model: res.data?.model || model || p.model,
    provider: p.name,
  };
}

/**
 * Streaming completion. Accumulates `content`, `reasoning`, and streamed
 * `tool_calls` (whose `arguments` arrive as partial JSON strings).
 */
export async function streamChatCompletion({
  provider,
  model,
  messages,
  tools,
  temperature,
  maxTokens,
  baseUrl,
  onChunk,
  onThinking,
  signal,
}) {
  const p = resolveProvider(provider, baseUrl);
  requireKey(p);

  const res = await axios.post(
    `${p.baseUrl}/chat/completions`,
    buildRequestBody({ model: model || p.model, messages, tools, temperature, maxTokens, stream: true }),
    { headers: authHeaders(p), responseType: 'stream', timeout: 180000, signal }
  );

  let content = '';
  let reasoning = '';
  let finishReason = 'stop';
  const toolAcc = [];
  let buffer = '';

  await new Promise((resolve, reject) => {
    res.data.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep the incomplete trailing line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;

        let parsed;
        try {
          parsed = JSON.parse(payload);
        } catch (_) {
          continue;
        }

        const choice = parsed.choices?.[0];
        if (!choice) continue;
        if (choice.finish_reason) finishReason = choice.finish_reason;

        const delta = choice.delta || {};
        const reasoningDelta = delta.reasoning_content || delta.reasoning;
        if (reasoningDelta) {
          reasoning += reasoningDelta;
          if (onThinking) onThinking(reasoningDelta);
        }
        if (typeof delta.content === 'string' && delta.content) {
          content += delta.content;
          if (onChunk) onChunk(delta.content);
        }
        if (Array.isArray(delta.tool_calls)) {
          for (const call of delta.tool_calls) mergeToolCallDelta(toolAcc, call);
        }
      }
    });

    res.data.on('end', resolve);
    res.data.on('error', reject);
  });

  const native = toolAcc
    .filter(Boolean)
    .map((call, i) => ({
      id: call.id || `call_${i + 1}`,
      name: call.name,
      source: 'native',
      arguments: safeParseArgs(call.arguments),
    }))
    .filter((call) => call.name);

  return {
    content,
    reasoning,
    toolCalls: native.length ? native : parseTextToolCalls(content),
    finishReason,
    model: model || p.model,
    provider: p.name,
  };
}

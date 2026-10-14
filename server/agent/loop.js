import { AGENT_SYSTEM_PROMPT } from './prompt.js';
import { TOOL_SCHEMAS, createToolExecutor, MUTATING_TOOLS } from './tools.js';
import { chatCompletion, streamChatCompletion } from './llm.js';

/**
 * The agent loop.
 *
 * This is the same shape as any real coding agent (Cline, Cursor, Devin):
 *
 *   plan → call a tool → observe the result → repeat → verify → complete
 *
 * Everything the model does flows through here. The loop owns the message
 * history, executes tools against the VirtualFileSystem, and emits events so
 * the UI can show every step live.
 */

const MAX_CONTEXT_CHARS = 120000;

/** Keep the system prompt + the most recent messages within a char budget. */
function trimMessages(messages) {
  if (messages.length <= 2) return messages;
  const system = messages[0];
  const rest = messages.slice(1);
  let total = 0;
  const kept = [];
  for (let i = rest.length - 1; i >= 0; i--) {
    const size = JSON.stringify(rest[i]).length;
    if (total + size > MAX_CONTEXT_CHARS && kept.length >= 4) break;
    total += size;
    kept.unshift(rest[i]);
  }
  return [system, ...kept];
}

/** Wrap the user's raw request in the studio's house style. */
export function buildTaskPrompt(request) {
  return `${request}

Build this as a complete, runnable web project in the virtual file system.
Work in the tool loop: inspect first, then write complete files, then verify.
Aim for a single self-contained \`index.html\` unless the request clearly needs more files.
When the project is done and you have re-read your entry file, call attempt_completion.`;
}

export async function runAgent({
  workspace,
  task,
  provider,
  model,
  maxSteps = 25,
  streaming = true,
  llm, // optional injected completion fn (used by tests / demo mode)
  onEvent = () => {},
  signal,
}) {
  const { vfs, messages } = workspace;
  const emit = (event) => onEvent(event);
  const execute = createToolExecutor(vfs, { onEvent: emit });

  if (!messages.length) messages.push({ role: 'system', content: AGENT_SYSTEM_PROMPT });
  messages.push({ role: 'user', content: buildTaskPrompt(task) });

  const callModel = async ({ onChunk, onThinking }) => {
    if (llm) return llm({ messages: trimMessages(messages), tools: TOOL_SCHEMAS, onChunk, onThinking });
    const args = {
      provider,
      model,
      messages: trimMessages(messages),
      tools: TOOL_SCHEMAS,
      signal,
      onChunk,
      onThinking,
    };
    return streaming ? streamChatCompletion(args) : chatCompletion(args);
  };

  const history = [];

  for (let step = 1; step <= maxSteps; step++) {
    emit({ type: 'step_start', step, maxSteps });

    let response;
    try {
      response = await callModel({
        onChunk: (chunk) => emit({ type: 'stream_chunk', step, chunk }),
        onThinking: (chunk) => emit({ type: 'thinking_chunk', step, chunk }),
      });
    } catch (error) {
      emit({ type: 'agent_error', step, error: error.message });
      return { status: 'error', error: error.message, steps: step, files: vfs.snapshot(), messages };
    }

    const text = response.content || '';
    const toolCalls = response.toolCalls || [];

    if (response.reasoning) emit({ type: 'thinking', step, text: response.reasoning });
    if (text) emit({ type: 'assistant_text', step, text });

    // ── No tool call: either the model is done, or it needs a nudge. ──────────
    if (toolCalls.length === 0) {
      messages.push({ role: 'assistant', content: text });
      if (!text.trim()) {
        messages.push({
          role: 'user',
          content: 'You returned nothing. Call exactly one tool, or call attempt_completion.',
        });
        continue;
      }
      emit({ type: 'step_end', step, tool: null });
      history.push({ step, text, tools: [] });
      continue;
    }

    // ── Execute the tool call(s) and feed the results back. ──────────────────
    const nativeCalls = toolCalls.filter((c) => c.source !== 'text');

    if (nativeCalls.length) {
      messages.push({
        role: 'assistant',
        content: text || '',
        tool_calls: nativeCalls.map((c) => ({
          id: c.id,
          type: 'function',
          function: { name: c.name, arguments: JSON.stringify(c.arguments ?? {}) },
        })),
      });
    } else {
      messages.push({ role: 'assistant', content: text });
    }

    const textResults = [];

    for (const call of toolCalls) {
      emit({ type: 'tool_call', step, id: call.id, tool: call.name, args: call.arguments });

      let result;
      try {
        result = await execute(call.name, call.arguments);
      } catch (error) {
        result = `Error: ${error.message}`;
      }

      const isMutating = MUTATING_TOOLS.has(call.name);
      emit({ type: 'tool_result', step, id: call.id, tool: call.name, result, mutating: isMutating });

      // Terminal tools end the run.
      if (typeof result === 'string' && result.startsWith('__COMPLETE__')) {
        const summary = result.slice('__COMPLETE__'.length);
        emit({ type: 'agent_complete', step, summary, previewPath: call.arguments?.preview_path });
        return {
          status: 'complete',
          summary,
          previewPath: call.arguments?.preview_path || null,
          steps: step,
          files: vfs.snapshot(),
          messages,
          history,
        };
      }
      if (typeof result === 'string' && result.startsWith('__ASK__')) {
        const question = result.slice('__ASK__'.length);
        emit({ type: 'agent_question', step, question });
        return { status: 'needs_input', question, steps: step, files: vfs.snapshot(), messages, history };
      }

      if (nativeCalls.length) {
        messages.push({ role: 'tool', tool_call_id: call.id, content: String(result) });
      } else {
        textResults.push(`Tool "${call.name}" result:\n${result}`);
      }
    }

    if (!nativeCalls.length && textResults.length) {
      messages.push({
        role: 'user',
        content: `${textResults.join('\n\n')}\n\nContinue: call the next tool, or call attempt_completion.`,
      });
    }

    emit({ type: 'step_end', step, tool: toolCalls.map((c) => c.name).join(', ') });
    history.push({ step, text, tools: toolCalls.map((c) => c.name) });
  }

  const summary = `Reached the ${maxSteps}-step limit before completing. The workspace has ${vfs.stats().files} file(s).`;
  emit({ type: 'agent_complete', step: maxSteps, summary, previewPath: null, truncated: true });
  return { status: 'max_steps', summary, steps: maxSteps, files: vfs.snapshot(), messages, history };
}

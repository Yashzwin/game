import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { VirtualFileSystem } from './vfs.js';
import { createToolExecutor, TOOL_SCHEMAS } from './tools.js';
import { parseTextToolCalls, streamChatCompletion } from './llm.js';
import { runAgent } from './loop.js';
import { createWorkspace } from './store.js';
import { register, unregister } from '../services/hub.js';
import { makeEmitter } from '../routes/agent.js';

process.env.POOLSIDE_API_KEY = process.env.POOLSIDE_API_KEY || 'test-key';

// ─────────────────────────────────────────────────────────────────────────────
// VirtualFileSystem
// ─────────────────────────────────────────────────────────────────────────────

test('vfs: writes, reads and reports stats', () => {
  const vfs = new VirtualFileSystem('demo');
  const info = vfs.write('index.html', '<!doctype html><h1>hi</h1>');
  assert.equal(info.path, 'index.html');
  assert.equal(info.lines, 1);
  assert.ok(info.bytes > 0);

  assert.equal(vfs.read('index.html'), '<!doctype html><h1>hi</h1>');
  assert.equal(vfs.stats().files, 1);
  assert.equal(vfs.root, '/demo');
});

test('vfs: creates implicit directories and lists/trees them', () => {
  const vfs = new VirtualFileSystem('demo');
  vfs.write('src/game.js', 'console.log(1)');
  vfs.write('src/entities/player.js', 'export const p = 1');
  vfs.write('index.html', '<html></html>');

  const root = vfs.list('.');
  assert.deepEqual(
    root.map((e) => `${e.type}:${e.name}`),
    ['directory:src', 'file:index.html']
  );

  const tree = vfs.tree('.');
  const src = tree.find((e) => e.name === 'src');
  assert.ok(src.children.some((c) => c.name === 'entities'));
  assert.ok(src.children.some((c) => c.name === 'game.js'));
});

test('vfs: rejects absolute paths and .. escapes', () => {
  const vfs = new VirtualFileSystem('demo');
  assert.throws(() => vfs.write('/etc/passwd', 'x'), /Absolute paths are not allowed/);
  assert.throws(() => vfs.read('../../secret'), /escapes the sandbox/);
  assert.throws(() => vfs.write('a/../../../b', 'x'), /escapes the sandbox/);
  assert.throws(() => vfs.write('', 'x'), /non-empty "path"/);
});

test('vfs: search finds matches with line numbers', () => {
  const vfs = new VirtualFileSystem('demo');
  vfs.write('a.js', 'const x = 1;\nconst y = 2;');
  vfs.write('b.js', 'let x = 3;');

  const hits = vfs.search('x =');
  assert.equal(hits.length, 2);
  assert.deepEqual(
    hits.map((h) => `${h.path}:${h.line}`),
    ['a.js:1', 'b.js:1']
  );

  // A case-insensitive substring search with no matches.
  assert.deepEqual(vfs.search('nope'), []);
});

test('vfs: snapshot round-trips through loadSnapshot', () => {
  const a = new VirtualFileSystem('demo');
  a.write('index.html', 'hi');
  a.write('src/x.js', 'yo');

  const b = new VirtualFileSystem('demo');
  b.loadSnapshot(a.snapshot());

  assert.equal(b.read('index.html'), 'hi');
  assert.equal(b.read('src/x.js'), 'yo');
  assert.deepEqual(b.snapshot(), a.snapshot());
});

test('vfs: enforces the per-file size limit', () => {
  const vfs = new VirtualFileSystem('demo');
  const huge = 'a'.repeat(2 * 1024 * 1024 + 1);
  assert.throws(() => vfs.write('big.js', huge), /exceeds the .* per-file limit/);
});

// ─────────────────────────────────────────────────────────────────────────────
// Tool executor
// ─────────────────────────────────────────────────────────────────────────────

test('tools: schemas are valid OpenAI function definitions', () => {
  const names = TOOL_SCHEMAS.map((t) => t.function.name);
  for (const expected of ['list_files', 'read_file', 'write_file', 'delete_file', 'search_files', 'attempt_completion']) {
    assert.ok(names.includes(expected), `missing tool: ${expected}`);
  }
  for (const t of TOOL_SCHEMAS) {
    assert.equal(t.type, 'function');
    assert.equal(t.function.parameters.type, 'object');
  }
});

test('tools: executor writes, reads, searches and deletes', async () => {
  const vfs = new VirtualFileSystem('demo');
  const events = [];
  const run = createToolExecutor(vfs, { onEvent: (e) => events.push(e) });

  const empty = await run('list_files', {});
  assert.match(empty, /no files yet/);

  const wrote = await run('write_file', { path: 'index.html', content: '<h1>Game</h1>' });
  assert.match(wrote, /Wrote index.html/);

  const listing = await run('list_files', {});
  assert.match(listing, /index\.html/);

  const read = await run('read_file', { path: 'index.html' });
  assert.match(read, /<h1>Game<\/h1>/);

  const found = await run('search_files', { query: 'Game' });
  assert.match(found, /index\.html:1/);

  const deleted = await run('delete_file', { path: 'index.html' });
  assert.match(deleted, /Deleted index\.html/);
  assert.equal(vfs.stats().files, 0);

  assert.deepEqual(
    events.map((e) => e.type),
    ['file_written', 'file_deleted']
  );
});

test('tools: executor surfaces errors as strings, not throws', async () => {
  const vfs = new VirtualFileSystem('demo');
  const run = createToolExecutor(vfs);
  const out = await run('read_file', { path: 'missing.js' });
  assert.match(out, /File not found/);

  const unknown = await run('not_a_tool', {});
  assert.match(unknown, /Unknown tool "not_a_tool"/);
});

test('tools: attempt_completion returns the sentinel', async () => {
  const vfs = new VirtualFileSystem('demo');
  const run = createToolExecutor(vfs);
  const out = await run('attempt_completion', { summary: 'Done!' });
  assert.equal(out, '__COMPLETE__Done!');
});

// ─────────────────────────────────────────────────────────────────────────────
// The agent loop
// ─────────────────────────────────────────────────────────────────────────────

/** Build a mock model that returns each scripted response in order. */
function scripted(responses) {
  let i = 0;
  return async ({ messages, tools, onChunk }) => {
    assert.ok(Array.isArray(tools) && tools.length > 0, 'the loop must send tools');
    const response = responses[Math.min(i, responses.length - 1)];
    i++;
    const value = typeof response === 'function' ? response({ messages }) : response;
    if (value.content && onChunk) onChunk(value.content);
    return value;
  };
}

/** A native (OpenAI tool_calls) response. */
const nativeCall = (name, args) => ({
  content: '',
  toolCalls: [{ id: `call_${name}`, name, source: 'native', arguments: args }],
});

test('loop: plans, writes, verifies and completes', async () => {
  const workspace = createWorkspace({ name: 'Snake' });
  const events = [];

  const html = '<!doctype html><html><body><canvas></canvas></body></html>';

  const result = await runAgent({
    workspace,
    task: 'Make a snake game',
    maxSteps: 10,
    llm: scripted([
      nativeCall('list_files', {}),
      nativeCall('write_file', { path: 'index.html', content: html }),
      nativeCall('read_file', { path: 'index.html' }),
      nativeCall('attempt_completion', { summary: 'Neon Snake is ready.', preview_path: 'index.html' }),
    ]),
    onEvent: (e) => events.push(e),
  });

  assert.equal(result.status, 'complete');
  assert.equal(result.summary, 'Neon Snake is ready.');
  assert.equal(result.previewPath, 'index.html');
  assert.equal(result.steps, 4);
  assert.equal(workspace.vfs.read('index.html'), html);

  const types = events.map((e) => e.type);
  assert.ok(types.includes('step_start'));
  assert.ok(types.includes('tool_call'));
  assert.ok(types.includes('tool_result'));
  assert.ok(types.includes('agent_complete'));

  // The system prompt + user task + assistant/tool turns are all recorded.
  assert.equal(workspace.messages[0].role, 'system');
  assert.match(workspace.messages[0].content, /VirtualFileSystem|VIRTUAL FILE SYSTEM/);
  assert.ok(workspace.messages.some((m) => m.role === 'tool' && /Wrote index\.html/.test(m.content)));
});

test('loop: stops at maxSteps when the model never completes', async () => {
  const workspace = createWorkspace({ name: 'Loop forever' });
  const result = await runAgent({
    workspace,
    task: 'Never finish',
    maxSteps: 3,
    llm: scripted([nativeCall('list_files', {})]),
  });

  assert.equal(result.status, 'max_steps');
  assert.equal(result.steps, 3);
  assert.match(result.summary, /3-step limit/);
});

test('loop: recovers tool calls a model emitted as text', async () => {
  const workspace = createWorkspace({ name: 'Text protocol' });
  const fence =
    'Here you go:\n```tool\n' +
    JSON.stringify({ name: 'write_file', arguments: { path: 'game.js', content: 'const ok = true;' } }) +
    '\n```';

  const result = await runAgent({
    workspace,
    task: 'Write a file using the text protocol',
    maxSteps: 5,
    llm: scripted([
      { content: fence, toolCalls: parseTextToolCalls(fence) },
      {
        content: 'All set.',
        toolCalls: parseTextToolCalls('```tool\n{"name":"attempt_completion","arguments":{"summary":"done"}}\n```'),
      },
    ]),
  });

  assert.equal(result.status, 'complete');
  assert.equal(workspace.vfs.read('game.js'), 'const ok = true;');
  // Text-protocol tool results are fed back as a user message, not role:tool.
  assert.ok(workspace.messages.some((m) => m.role === 'user' && /Tool "write_file" result/.test(m.content)));
});

test('loop: surfaces provider errors without throwing', async () => {
  const workspace = createWorkspace({ name: 'Errors' });
  const result = await runAgent({
    workspace,
    task: 'boom',
    llm: async () => {
      throw new Error('402 Payment Required');
    },
  });

  assert.equal(result.status, 'error');
  assert.match(result.error, /402/);
});

test('loop: ask_followup_question pauses for input', async () => {
  const workspace = createWorkspace({ name: 'Ask' });
  const result = await runAgent({
    workspace,
    task: 'Make a game',
    llm: scripted([nativeCall('ask_followup_question', { question: '2D or 3D?' })]),
  });

  assert.equal(result.status, 'needs_input');
  assert.equal(result.question, '2D or 3D?');
});

// ─────────────────────────────────────────────────────────────────────────────
// Text-protocol parsing + streaming tool-call accumulation
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket transport
// ─────────────────────────────────────────────────────────────────────────────

test('transport: agent events are wrapped so their type cannot collide', () => {
  const sent = [];
  const fakeWs = { readyState: 1, send: (payload) => sent.push(JSON.parse(payload)) };
  const clientId = 'test-client';
  register(clientId, fakeWs);

  try {
    makeEmitter(clientId)({ type: 'tool_call', tool: 'write_file', args: { path: 'a.js' } });

    assert.equal(sent.length, 1);
    assert.equal(sent[0].type, 'agent_event');
    assert.equal(sent[0].event.type, 'tool_call');
    assert.equal(sent[0].event.tool, 'write_file');
  } finally {
    unregister(clientId);
  }
});

test('transport: emitting to an unknown client is a no-op', () => {
  assert.doesNotThrow(() => makeEmitter('nobody')({ type: 'step_start' }));
});

test('llm: parses fenced, tagged and bare text tool calls', () => {
  assert.equal(parseTextToolCalls('```tool\n{"name":"list_files","arguments":{}}\n```')[0].name, 'list_files');
  assert.deepEqual(
    parseTextToolCalls('<tool_call>{"name":"read_file","arguments":{"path":"a.js"}}</tool_call>')[0].arguments,
    { path: 'a.js' }
  );
  assert.equal(
    parseTextToolCalls('{"name":"attempt_completion","arguments":{"summary":"x"}}')[0].name,
    'attempt_completion'
  );
  assert.deepEqual(parseTextToolCalls('just prose, no tool here'), []);
  // Unknown / dangerous tool names are ignored rather than executed.
  assert.deepEqual(parseTextToolCalls('```tool\n{"name":"rm_rf","arguments":{}}\n```'), []);
});

test('llm: streams content, reasoning and split tool-call arguments', async () => {
  const line = (obj) => `data: ${JSON.stringify(obj)}\n\n`;
  const chunks = [
    line({ choices: [{ delta: { reasoning_content: 'Thinking…' } }] }),
    line({ choices: [{ delta: { content: 'Writ' } }] }),
    line({ choices: [{ delta: { content: 'ing file' } }] }),
    line({
      choices: [
        {
          delta: {
            tool_calls: [{ index: 0, id: 'call_1', function: { name: 'write_file', arguments: '{"path":"ind' } }],
          },
        },
      ],
    }),
    line({
      choices: [
        {
          delta: {
            tool_calls: [{ index: 0, function: { arguments: 'ex.html","content":"<h1>hi</h1>"}' } }],
          },
        },
      ],
    }),
    line({ choices: [{ delta: {}, finish_reason: 'tool_calls' }] }),
    'data: [DONE]\n\n',
  ];

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    // Deliberately split the stream across two writes to exercise line buffering.
    res.write(chunks.slice(0, 3).join(''));
    setTimeout(() => {
      res.write(chunks.slice(3).join(''));
      res.end();
    }, 10);
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const streamed = [];
    const thoughts = [];
    const result = await streamChatCompletion({
      provider: 'poolside',
      baseUrl,
      messages: [{ role: 'user', content: 'make a game' }],
      tools: TOOL_SCHEMAS,
      onChunk: (c) => streamed.push(c),
      onThinking: (t) => thoughts.push(t),
    });

    assert.equal(result.content, 'Writing file');
    assert.equal(result.reasoning, 'Thinking…');
    assert.equal(result.finishReason, 'tool_calls');
    assert.equal(result.toolCalls.length, 1);
    assert.equal(result.toolCalls[0].name, 'write_file');
    assert.equal(result.toolCalls[0].source, 'native');
    assert.deepEqual(result.toolCalls[0].arguments, {
      path: 'index.html',
      content: '<h1>hi</h1>',
    });
    assert.deepEqual(streamed, ['Writ', 'ing file']);
    assert.deepEqual(thoughts, ['Thinking…']);
  } finally {
    server.close();
  }
});

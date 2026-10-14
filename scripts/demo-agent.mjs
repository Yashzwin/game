#!/usr/bin/env node
/**
 * Demo: run the agent loop end-to-end.
 *
 *   node scripts/demo-agent.mjs            # offline — scripted mock model, no key needed
 *   node scripts/demo-agent.mjs --live     # real provider from server/agent-config.json or env
 *
 * The offline mode proves the loop, the virtual file system and the tools work
 * without spending a single token.
 */
import { runAgent } from '../server/agent/loop.js';
import { createWorkspace } from '../server/agent/store.js';
import { parseTextToolCalls } from '../server/agent/llm.js';
import { publicAgentConfig, resolveProvider } from '../server/agent/providers.js';

const live = process.argv.includes('--live');

const GAME_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Bounce</title>
<style>
  html,body{margin:0;height:100%;background:#0b1020;display:grid;place-items:center;font-family:system-ui}
  canvas{background:#111a35;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
</style>
</head>
<body>
<canvas id="c" width="480" height="360"></canvas>
<script>
  const c = document.getElementById('c'), x = c.getContext('2d');
  let ball = { x: 240, y: 180, dx: 3, dy: 2.4, r: 12 }, score = 0;
  c.addEventListener('pointermove', (e) => { ball.x = e.offsetX; });
  (function loop() {
    x.clearRect(0, 0, c.width, c.height);
    ball.x += ball.dx; ball.y += ball.dy;
    if (ball.x < ball.r || ball.x > c.width - ball.r) ball.dx *= -1;
    if (ball.y < ball.r || ball.y > c.height - ball.r) ball.dy *= -1;
    x.fillStyle = '#4ade80'; x.beginPath(); x.arc(ball.x, ball.y, ball.r, 0, 7); x.fill();
    x.fillStyle = '#e5e7eb'; x.font = '16px system-ui'; x.fillText('score ' + score++, 12, 24);
    requestAnimationFrame(loop);
  })();
</script>
</body>
</html>`;

/** A scripted "model" that behaves like a well-behaved coding agent. */
function mockModel(script) {
  let i = 0;
  return async ({ onChunk, onThinking }) => {
    const entry = script[Math.min(i, script.length - 1)];
    i++;
    if (entry.thinking && onThinking) onThinking(entry.thinking);
    if (entry.content && onChunk) onChunk(entry.content);
    return {
      content: entry.content || '',
      reasoning: entry.thinking || '',
      toolCalls: entry.toolCalls || entry.calls || [],
    };
  };
}

const native = (name, args) => ({ id: `call_${name}`, name, source: 'native', arguments: args });

function scriptedGame() {
  const fence = (obj) => ({ content: `\`\`\`tool\n${JSON.stringify(obj)}\n\`\`\`` });
  return [
    {
      thinking: 'I should inspect the empty workspace before writing anything.',
      calls: [native('list_files', {})],
    },
    {
      thinking: 'Empty. I will write a single self-contained index.html game.',
      calls: [native('write_file', { path: 'index.html', content: GAME_HTML })],
    },
    {
      thinking: 'Verify the file landed and looks right.',
      calls: [native('read_file', { path: 'index.html' })],
    },
    // Demonstrates the text-protocol fallback (for models without native tools).
    {
      ...fence({ name: 'attempt_completion', arguments: { summary: 'Bounce is ready — move the pointer to steer the ball.', preview_path: 'index.html' } }),
      calls: [],
    },
  ].map((entry) => ({
    ...entry,
    toolCalls: entry.calls.length
      ? entry.calls
      : parseTextToolCalls(entry.content || '').map((c) => ({ ...c, source: 'text' })),
  }));
}

const workspace = createWorkspace({ name: 'Demo — Bounce' });

let provider;
let model;
let llm;

if (live) {
  const cfg = resolveProvider(undefined);
  provider = cfg.name;
  model = cfg.model;
  console.log(`🔌 Live mode: ${cfg.label} / ${cfg.model}`);
} else {
  console.log('🎭 Offline demo — scripted model, no API key required.\n');
  llm = mockModel(scriptedGame());
}

const icons = {
  step_start: (e) => `\n── step ${e.step}/${e.maxSteps} ─────────────────────────────`,
  thinking_chunk: () => '',
  thinking: (e) => `🧠 ${String(e.text).trim()}`,
  stream_chunk: () => '',
  assistant_text: (e) => `💬 ${String(e.text).trim().slice(0, 200)}`,
  tool_call: (e) => `🔧 ${e.tool}(${JSON.stringify(e.args).slice(0, 120)})`,
  tool_result: (e) => `   ↳ ${String(e.result).split('\n')[0].slice(0, 140)}`,
  agent_complete: (e) => `\n✅ ${e.summary}`,
  agent_error: (e) => `\n❌ ${e.error}`,
};

const result = await runAgent({
  workspace,
  task: 'Make a tiny bouncing-ball game with a score counter.',
  provider,
  model,
  maxSteps: 12,
  streaming: live,
  llm,
  onEvent: (event) => {
    const render = icons[event.type];
    if (render) {
      const line = render(event);
      if (line) console.log(line);
    }
  },
});

console.log('\n📁 Virtual file system:');
for (const file of result.files) {
  console.log(`   ${file.path} — ${file.content.length} bytes`);
}
console.log(`\nStatus: ${result.status} · steps: ${result.steps}`);
console.log(`Preview: /sandbox/${workspace.id}/${result.previewPath || 'index.html'}`);

if (live) {
  console.log(`\nKeys configured: ${JSON.stringify(publicAgentConfig().providers.map((p) => ({ [p.name]: p.hasKey })))}`);
}

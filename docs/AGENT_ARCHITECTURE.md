# How an agent like me actually works

This document explains the machine, and maps every part of it to real files in
this repo. The goal is a **replica**: an autonomous coding agent that builds
games and web projects inside a **web sandbox**, with **no GitHub** and no host
filesystem.

---

## 1. The one idea

An agent is not a smarter chatbot. It is a **loop** wrapped around a plain LLM:

```
        ┌──────────────────────────────────────────────┐
        │                                              │
        ▼                                              │
   ┌─────────┐   tool call    ┌──────────────┐         │
   │  MODEL  │ ─────────────▶ │ TOOL EXECUTOR│         │
   │ (LLM)   │                │ (your code)  │         │
   └─────────┘ ◀───────────── └──────────────┘         │
        │        tool result         │                  │
        │                           ▼                  │
        │                   ┌───────────────┐          │
        └──────────────────▶│ VIRTUAL FS    │──────────┘
          "what changed?"   │ (in memory)   │   new state
                            └───────────────┘
```

The model only ever does two things: **call a tool**, or **say it's done**.
Everything else — reading, writing, searching, verifying — is the loop feeding
results back. Intelligence comes from *many small verified steps*, not one big
answer.

> Contrast with the pre-existing one-shot generator in `server/services/gameBuilder.js`:
> that makes **one** call, asks for a JSON blob of files, and writes it to disk.
> No inspection, no verification, no recovery. That is a code generator, not an agent.

---

## 2. The five layers

| Layer | File | Job |
|---|---|---|
| **1. Identity** | `server/agent/prompt.js` | The system prompt: who the agent is, its rules, its tool-call protocol. |
| **2. Tools** | `server/agent/tools.js` | JSON schemas the model sees + the executors that run them. |
| **3. Sandbox FS** | `server/agent/vfs.js` | The in-memory, path-jailed file system. |
| **4. Transport** | `server/agent/llm.js` | One OpenAI-compatible client; streams, parses tool calls. |
| **5. The loop** | `server/agent/loop.js` | Plan → act → observe → repeat → verify → complete. |

Supporting cast:

- `server/agent/providers.js` — OpenRouter / Poolside / Hugging Face registry + key storage.
- `server/agent/store.js` — in-memory workspace registry (FS + conversation).
- `server/routes/agent.js` — HTTP + WebSocket surface.
- `server/index.js` — serves `/sandbox/:workspaceId/*` **from the VFS**, so the
  game preview runs with zero host footprint.

---

## 3. The loop, step by step

`server/agent/loop.js` → `runAgent()`

```
messages = [ systemPrompt, userTask ]

for step in 1..maxSteps:
    response = model(messages, tools)          # streamed

    if response has no tool call:
        if it was empty text → nudge: "call a tool"
        else → append and continue

    for each tool call:
        emit tool_call event                   # the user watches this live
        result = execute(name, args)           # runs against the VFS
        emit tool_result event

        if name == attempt_completion → DONE
        if name == ask_followup_question → PAUSE for the user

        messages.append(tool result)           # ← the observation
```

Three details that make it actually work in practice:

**a) One tool per step.** `parallel_tool_calls: false` in `llm.js`. Sequential
steps keep the loop deterministic and make recovery easy.

**b) Tools never throw.** `createToolExecutor` catches everything and returns
`"Error: ..."` as the tool result. The model reads the error and fixes itself
on the next step. A thrown exception would kill the run.

**c) Two protocols.** Native OpenAI `tool_calls` when the model supports them;
otherwise `parseTextToolCalls()` recovers a call from a ` ```tool ` fence,
`<tool_call>` tag, or bare JSON. Free models often need the fallback — this is
why the agent works on cheap models.

---

## 4. The virtual file system (the "web sandbox")

`server/agent/vfs.js` — a `Map<absolutePath, string>` with three guarantees:

1. **Jailed.** `resolve()` rejects absolute paths and anything that escapes the
   root. `../../etc/passwd` throws. Verified by test + the HTTP smoke test.
2. **Bounded.** 2 MB per file, 2000 files. A runaway model cannot exhaust memory.
3. **Text-only.** Binary extensions are refused.

Because it's just a Map, the whole workspace is `snapshot()`-able (for
persistence or replay) and `loadSnapshot()`-able (for rehydration).

**Serving it:** `server/index.js` exposes `/sandbox/:workspaceId/*`, reading
straight from the VFS. The preview `<iframe>` loads a real, playable game whose
files never touched a disk. That is the "web sandbox only" requirement, met.

---

## 5. Providers

All three speak the same dialect (`POST {baseUrl}/chat/completions`, `tools`,
`tool_calls`), so one client drives them:

| Provider | Base URL | Key env var |
|---|---|---|
| OpenRouter | `https://openrouter.ai/api/v1` | `OPENROUTER_API_KEY` |
| Poolside | `https://inference.poolside.ai/v1` | `POOLSIDE_API_KEY` |
| Hugging Face | `https://router.huggingface.co/v1` | `HF_TOKEN` |

Keys are read from `server/agent-config.json` first, then the environment, and
are **never** returned to the browser — only `sk-or-v1-…a1b2` masked forms
(`publicAgentConfig()`).

---

## 6. Running it

```bash
npm install                 # deps (express, axios, ws, fs-extra)
npm test                    # 17 tests — VFS, tools, loop, streaming. No API key needed.
npm run agent:demo          # full loop end-to-end with a scripted model. No key.
npm run agent:demo -- --live   # same, but against your real provider
npm run dev                 # the studio UI + agent API on :3001 / :5173
```

Set a key either in `server/agent-config.json`:

```json
{ "provider": "poolside", "keys": { "poolside": "sk-..." } }
```

…or via the API:

```bash
curl -X POST localhost:3001/api/agent/config \
  -H 'Content-Type: application/json' \
  -d '{"provider":"poolside","keys":{"poolside":"sk-..."}}'
```

---

## 7. HTTP API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/agent/providers` | Providers + masked key status + model lists |
| `POST` | `/api/agent/config` | Save provider / keys / models |
| `POST` | `/api/agent/workspaces` | Create a workspace (VFS + conversation) |
| `GET` | `/api/agent/workspaces` | List workspaces |
| `GET` | `/api/agent/workspaces/:id` | One workspace + file tree |
| `DELETE` | `/api/agent/workspaces/:id` | Drop it |
| `GET` | `/api/agent/workspaces/:id/tree` | Nested tree + stats |
| `GET` | `/api/agent/workspaces/:id/file?path=` | Read a file |
| `PUT` | `/api/agent/workspaces/:id/file` | Write a file (Monaco save) |
| `DELETE` | `/api/agent/workspaces/:id/file?path=` | Delete a file |
| `POST` | `/api/agent/workspaces/:id/run` | **Start the agent** |
| `GET` | `/sandbox/:workspaceId/*` | Serve a VFS file to the preview iframe |

`POST .../run` returns immediately; progress streams over the existing
WebSocket. Each event is wrapped in an `agent_event` envelope so it can never
collide with the existing terminal/generation message types:

```jsonc
{ "type": "agent_event", "event": { "type": "step_start",     "step": 2, "maxSteps": 25 } }
{ "type": "agent_event", "event": { "type": "thinking_chunk", "chunk": "..." } }
{ "type": "agent_event", "event": { "type": "tool_call",      "tool": "write_file", "args": {} } }
{ "type": "agent_event", "event": { "type": "tool_result",    "tool": "write_file", "result": "Wrote index.html (1141 bytes, 29 lines)." } }
{ "type": "agent_event", "event": { "type": "agent_complete", "summary": "...", "previewPath": "index.html" } }
```

That event stream is exactly what you render to make the process *transparent* —
a live "reasoning + tool calls" panel, like this very session.

---

## 8. Wiring the UI (next step)

The backend is complete and tested. To put a face on it, in `client/src`:

1. Add `agentApi` to `client/src/utils/api.js` (mirror the existing `gamesApi`).
2. In `client/src/hooks/useWebSocket.js`, add a `case 'agent_event':` branch that
   dispatches to a store slice (`useStore`).
3. Reuse `FileTree.jsx` with `workspace.tree`, `CodeWorkspace.jsx` (Monaco) for
   `GET/PUT .../file`, and `PreviewFrame.jsx` pointed at `workspace.previewUrl`.

Nothing in the existing studio breaks — the agent lives alongside it under
`/api/agent` and `/sandbox`.

---

## 9. Security model

| Threat | Mitigation |
|---|---|
| Model reads/writes outside its workspace | `vfs.resolve()` path jail (tested) |
| Model exhausts memory | 2 MB/file, 2000 files, context trimming |
| Key leaks to the browser | `maskKey()`; full key never serialized |
| Model calls an invented tool | `parseTextToolCalls` ignores unknown names; executor returns a hint |
| Run never ends | `maxSteps` ceiling → `status: "max_steps"` |
| Provider 4xx/5xx | Caught in the loop → `status: "error"`, run survives |

**Deliberately absent:** there is no host shell and no GitHub. The old
`server/services/terminal.js` spawns real bash — if you want the pure
"web sandbox only" model, do not expose it to the agent. Execution belongs in
the browser iframe, which is already how games run here.

---

## 10. Extending the agent

Adding a capability is two edits:

1. Append a schema to `TOOL_SCHEMAS` in `tools.js`.
2. Add a `case` in `runTool`.

Ideas that fit this architecture:

- `read_file` with line ranges (cheaper context on big files)
- `apply_patch` for surgical edits instead of whole-file rewrites
- Persist workspaces to disk or IndexedDB via `snapshot()` / `loadSnapshot()`
- A vision tool (`analyzeImage` already exists in `services/openrouter.js`) so
  the agent can *look at* its own rendered game and fix the layout
- A reviewer sub-agent that critiques the game before `attempt_completion`

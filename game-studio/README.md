# 🎬 AI Game Studio — Cinema Edition

A professional, agentic **AI game development studio**. Describe a game — 2D or 3D — and the AI
designs, codes, and runs it live. Everything is transparent: you watch the reasoning, the generated
files, and the terminal.

Powered by **OpenRouter** free models.

---

## ✨ Features

| | |
|---|---|
| 🧠 **Agentic AI Director** | Chat-first. Describe genre, style, mechanics — the AI plans and writes every file. |
| 🎮 **2D + 3D Games** | Phaser.js for 2D, Three.js for 3D — chosen automatically per request. |
| 📁 **Multi-file Projects** | Full source tree with a Monaco editor, syntax highlighting, and live save. |
| ▶️ **Live Preview** | Playable in-app iframe with desktop / square / mobile viewports. |
| 👁️ **AI Vision Review** | Upload a game screenshot for professional art & UI feedback. |
| 💻 **Built-in Terminal** | Real bash shell scoped to your games directory. |
| 🔄 **Iterate Mode** | Ask for changes and the AI rewrites the game. |
| 🎞️ **Transparent** | Live stream of the AI's reasoning + raw output on errors. |
| 🗂️ **Game Library** | Every generated game is saved and re-openable. |

---

## 🚀 Quick Start

### 1. Requirements
- **Node.js 18+** (tested on 24)

### 2. Install
```bash
npm run install:all
```

### 3. Add your OpenRouter API key
```bash
cp .env.example .env
```
Then edit `.env`:
```
OPENROUTER_API_KEY=sk-or-v1-...
PORT=3001
```

Get a free key at **https://openrouter.ai/keys**

### 4. Run (development)
```bash
npm run dev
```
- UI → http://localhost:5173
- API/WS → http://localhost:3001

### 5. Run (production / single port)
```bash
npm run build      # builds the client
npm start          # serves UI + API + games on http://localhost:3001
```

---

## 🎯 How to Use

1. **Open the studio** — a welcome overlay explains everything.
2. **Describe a game** in the chat, e.g.
   > *"A 2D platformer with a ninja that double-jumps, wall-slides, and collects coins. Add parallax background and particle effects."*
   …or click a **Quick Start** template.
3. **Watch it build** — status messages, saved file list, and the AI reasoning panel stream in live.
4. **Play it** — the game appears in the **Preview** tab instantly.
5. **Inspect the code** — the **Code** tab shows every file in a Monaco editor. Edit and hit **Save** (`Ctrl+S`) to reload the preview.
6. **Iterate** — switch the chat to **Iterate** mode and ask for changes.
7. **Review** — open **Vision** to get AI feedback on a screenshot or the game code.
8. **Explore** — use the **Terminal** tab to run real commands.

---

## 🎭 Try it without an API key (Demo Mode)

Set `MOCK_AI=1` in `.env` and restart. The studio will generate **canned 2D and 3D demo games**
(Aurora Runner / Orbital Drift) so you can explore the full UI — chat streaming, file tree, editor,
preview, terminal, and vision — before adding a real key.

```bash
# .env
MOCK_AI=1
```

> Demo mode never calls OpenRouter. Set `MOCK_AI=0` to use real models.

---

## 🧠 Models

The studio ships with curated free models and can fetch **all live free models** from OpenRouter
(*Settings → Load all live free models*).

| Model | Params | Context | Best for |
|---|---|---|---|
| **Cohere: North Mini Code** ⚡ | 157B | 256K | **Default** — best game code, fastest |
| **NVIDIA: Nemotron 3 Ultra** 🧠 | 6.9T MoE | 1M | Complex 3D logic & deep reasoning |
| **Poolside: Laguna XS 2.1** 🚀 | 84B | 262K | Fast iteration |
| **Google: Gemma 4 31B** 👁️ | 31B | 262K | Vision analysis (automatic) |
| NVIDIA: Nemotron 3 Super | 120B | 262K | Balanced |
| Thinking Machines: Inkling | MoE | 1M | Very long context |
| NVIDIA: Nemotron 3.5 Lightning | MoE | 1M | Fast + long context |

> You can also paste **any** model ID (including paid ones) in *Settings → Custom model ID*.

---

## 🏗️ Architecture

```
game-studio/
├── server/                     # Node.js + Express + WebSocket
│   ├── index.js                # Server bootstrap, WS hub, static serving
│   ├── routes/
│   │   ├── ai.js               # /api/ai  — generate, iterate, chat, vision, models
│   │   ├── games.js            # /api/games — list, get, delete
│   │   └── files.js            # /api/files — save file, upload image
│   ├── services/
│   │   ├── openrouter.js       # OpenRouter streaming client + model roster
│   │   ├── gameBuilder.js      # Prompt → JSON game → files on disk
│   │   └── terminal.js         # Sandboxed bash sessions
│   └── games/                  # Generated games (served at /games/*)
│
└── client/                     # React + Vite + Tailwind
    └── src/
        ├── App.jsx             # Layout shell (resizable panels)
        ├── components/         # Chat, Preview, Code, Terminal, Vision, Settings…
        ├── hooks/useWebSocket.js
        ├── store/useStore.js   # Zustand global state
        └── utils/api.js
```

### Data flow
1. You send a prompt → `POST /api/ai/generate`.
2. The server streams the model's response over **WebSocket** (`stream_chunk`, `thinking_chunk`).
3. The AI returns a **JSON game manifest** (files, metadata, controls).
4. `gameBuilder` writes every file to `server/games/<id>/`.
5. The server broadcasts `generation_complete` with a preview URL.
6. The client loads the game in a sandboxed iframe from `/games/<id>/index.html`.

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/ai/models` | Curated model roster |
| `GET` | `/api/ai/models-live` | All live free models from OpenRouter |
| `GET` | `/api/ai/test-key` | Validate the API key |
| `POST` | `/api/ai/generate` | Generate a new game (streams over WS) |
| `POST` | `/api/ai/iterate/:gameId` | Modify an existing game |
| `POST` | `/api/ai/chat` | General chat completion |
| `POST` | `/api/ai/vision` | Vision analysis (image or code) |
| `GET` | `/api/games` | List all games |
| `GET` | `/api/games/:id` | Get game metadata + files |
| `DELETE` | `/api/games/:id` | Delete a game |
| `PUT` | `/api/files/:gameId/*` | Save an edited file |
| `POST` | `/api/files/upload-image` | Upload image for vision |

### WebSocket messages
**Client → Server:** `terminal_command`, `terminal_start`, `terminal_input`, `terminal_kill`, `ping`

**Server → Client:** `connected`, `generation_start`, `thinking`, `stream_chunk`, `thinking_chunk`,
`parsing`, `saving`, `generation_complete`, `generation_error`, `terminal_output`

---

## ⚙️ Configuration

| Variable | Default | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | — | **Required.** Your OpenRouter key |
| `PORT` | `3001` | Server port |
| `GAMES_DIR` | `./server/games` | Where games are written |

---

## 🔒 Notes

- Games run in a **sandboxed iframe** (`allow-scripts allow-same-origin`).
- The terminal blocks a small set of destructive patterns (`rm -rf /`, `mkfs`, …).
- Generated games are **self-contained** — procedural graphics and Web Audio, no external assets.

---

## 🧩 A bundled demo

A polished **Neon Snake** game ships in `server/games/demo-snake/` so you can try the preview, code
editor, and terminal before generating anything.

---

## 📄 License

MIT

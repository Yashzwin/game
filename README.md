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

> **Everything is configured in the web UI — you never need to edit a file or set environment variables.**

### Step 1 — Install Node.js (once)

Download and install **Node.js 18 or newer** from **https://nodejs.org** (pick the LTS version).
To check it worked, open a terminal and run:

```bash
node --version
```

### Step 2 — Open a terminal

| Your OS | Where to open it |
|---|---|
| **Windows** | Press `Win`, type **PowerShell**, press Enter |
| **macOS** | Press `Cmd + Space`, type **Terminal**, press Enter |
| **Linux** | Open your **Terminal** app |

### Step 3 — Get the project and install

In that terminal, run these **one at a time**:

```bash
# 1. Go to a folder where you keep projects (example)
cd ~/Documents

# 2. Download the project
git clone https://github.com/Yashzwin/game.git

# 3. Enter the project folder
cd game

# 4. Install everything (backend + frontend) — takes ~30s
npm run install:all
```

> No Git? Download the ZIP from the GitHub page, unzip it, then `cd` into the unzipped folder and
> run only step 4.

### Step 4 — Start the studio

**Option A — Development mode** (hot reload, best while building):

```bash
npm run dev
```

Then open **http://localhost:5173** in your browser.

**Option B — Single-port mode** (simplest, one URL):

```bash
npm run build
npm start
```

Then open **http://localhost:3001** in your browser.

### Step 5 — Add your API key (in the web UI)

1. Click **Settings** in the top-right corner.
2. Paste your **OpenRouter API Key** — get one free at **https://openrouter.ai/keys**
3. Leave **Base URL** as `https://openrouter.ai/api/v1`
   *(or point it at any OpenAI-compatible endpoint)*
4. Click **Save**, then **Test Connection** — you should see a green *Connected in XXms*.
5. Close Settings and start creating games!

> **No key yet?** In Settings, turn on **Demo Mode** — the studio generates canned 2D/3D demo games
> so you can explore every feature first.

### Stopping / restarting

- **Stop:** press `Ctrl + C` in the terminal.
- **Restart:** run `npm run dev` (or `npm start`) again.
- Your API key, base URL, and generated games are **saved on disk** and survive restarts.

---

### 📋 Command reference

Run all of these **from inside the project folder**:

| Command | What it does |
|---|---|
| `npm run install:all` | Install backend + frontend dependencies |
| `npm run dev` | Start dev mode (UI on `:5173`, API on `:3001`) |
| `npm run build` | Build the frontend for production |
| `npm start` | Serve everything on `:3001` |
| `npm run server` | Backend only |
| `npm run client` | Frontend only |

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

In **Settings**, turn on **Demo Mode**. The studio then generates **canned 2D and 3D demo games**
(Aurora Runner / Orbital Drift) so you can explore the full UI — chat streaming, file tree, editor,
preview, terminal, and vision — before adding a real key.

> Demo mode never calls OpenRouter. Turn it off in Settings to use real models.

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
│   ├── config.json             # Saved API key / base URL (git-ignored)
│   ├── routes/
│   │   ├── ai.js               # /api/ai     — generate, iterate, chat, vision, models
│   │   ├── games.js            # /api/games  — list, get, delete
│   │   ├── files.js            # /api/files  — save file, upload image
│   │   └── config.js           # /api/config — API key, base URL, test connection
│   ├── services/
│   │   ├── config.js           # Runtime settings store (web-UI driven)
│   │   ├── openrouter.js       # Streaming client + model roster
│   │   ├── gameBuilder.js      # Prompt → JSON game → files on disk
│   │   ├── hub.js              # WebSocket client registry
│   │   ├── mockAI.js           # Demo mode
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
0. You save your API key + base URL once in **Settings** (stored in `server/config.json`).
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
| `GET` | `/api/config` | Current settings (key is masked) |
| `POST` | `/api/config` | Save API key / base URL / demo mode |
| `POST` | `/api/config/test` | Test the saved connection |
| `DELETE` | `/api/config/key` | Remove the saved API key |
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

**All configuration lives in the web UI.** Open **Settings** in the studio to set:

| Setting | Default | Description |
|---|---|---|
| **API Key** | — | Your OpenRouter key (saved to `server/config.json`) |
| **Base URL** | `https://openrouter.ai/api/v1` | Any OpenAI-compatible endpoint |
| **Demo Mode** | off | Generate demo games without a key |
| **AI Model** | `cohere/north-mini-code:free` | Model used for generation |

Saved settings persist in `server/config.json` (git-ignored — it contains your key).

Optional environment variables (`.env`) act as **fallbacks** if nothing is set in the UI:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Server port |
| `GAMES_DIR` | `./server/games` | Where games are written |
| `OPENROUTER_API_KEY` | — | Fallback key |
| `OPENROUTER_BASE_URL` | OpenRouter | Fallback base URL |
| `MOCK_AI` | `0` | Force demo mode |

---

## 🔒 Notes

- Your API key is **never sent back to the browser** — the server returns only a masked form
  (`sk-or-v1-…a1b2`).
- Games run in a **sandboxed iframe** (`allow-scripts allow-same-origin`).
- The terminal blocks a small set of destructive patterns (`rm -rf /`, `mkfs`, …).
- Generated games are **self-contained** — procedural graphics and Web Audio, no external assets.

---

## 🧩 A bundled demo

A polished **Neon Snake** game ships in `server/games/demo-snake/` so you can try the preview, code
editor, and terminal before generating anything.

---

## 🆘 Troubleshooting

**`npm error enoent Could not read package.json`**
You're in the wrong folder. `npm` must be run from the folder that contains `package.json`. Check
with `dir` (Windows) or `ls` (macOS/Linux) — you should see `package.json`, `server`, and `client`.
If you don't, move into the right folder:

```powershell
cd C:\Users\<you>\Documents\game      # the folder containing package.json
dir                                   # confirm package.json is listed
npm run install:all
```

**`'npm' is not recognized`**
Node.js isn't installed, or the terminal was opened before you installed it. Install the LTS build
from **https://nodejs.org**, then **close and reopen** the terminal.

**`Error: listen EADDRINUSE: address already in use :::3001`**
The studio is already running in another terminal, or another app uses port 3001. Stop the other
process, or use a different port:

```powershell
$env:PORT=3002; npm start      # PowerShell
PORT=3002 npm start            # macOS / Linux
```

**`npm run dev` starts but the page is blank**
Check you opened the right URL — **http://localhost:5173** for `npm run dev`, or
**http://localhost:3001** for `npm run build && npm start`.

**Games won't generate — "No API key configured"**
Open **Settings** in the studio, paste your key, then hit **Test Connection**. If the test fails the
message tells you exactly why (bad key, wrong base URL, no credits). No key yet? Turn on **Demo
Mode** in the same panel.

**Changing my key or base URL later**
Just open **Settings** again — everything is editable there, no files to touch. It's saved to
`server/config.json` (git-ignored, because it holds your key).

**Reset everything**
Delete `server/config.json` (saved settings) and the `server/games/` folder (generated games).
Nothing else is persisted.

---

## 📄 License

MIT

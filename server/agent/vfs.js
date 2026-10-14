import { posix } from 'path';

/**
 * VirtualFileSystem — an in-memory, path-jailed file system.
 *
 * This is the "web sandbox" file system: nothing is ever written to the host
 * disk. The agent (and the Monaco editor in the browser) read/write here, and
 * files are served back to a sandboxed `<iframe>` for live preview.
 *
 * Design rules (these are what make it safe as an LLM target):
 *   - Every path is resolved relative to a single workspace root.
 *   - Absolute paths and `..` escapes are rejected outright.
 *   - Sizes are bounded so a runaway model can't exhaust memory.
 */

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB per file
const MAX_TOTAL_FILES = 2000;

/** Binary-ish extensions we refuse to treat as text. */
const BINARY_EXT_RE =
  /\.(png|jpe?g|gif|webp|bmp|ico|mp3|wav|ogg|mp4|webm|zip|gz|tar|woff2?|ttf|eot|wasm|pdf|exe|dll|so|dylib)$/i;

function normalizeRoot(root) {
  const cleaned = String(root || 'sandbox')
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '');
  return `/${cleaned || 'sandbox'}`;
}

export class VirtualFileSystem {
  constructor(root = 'sandbox') {
    this.root = normalizeRoot(root);
    /** @type {Map<string, string>} absolute posix path -> text content */
    this.files = new Map();
  }

  /**
   * Resolve a workspace-relative path to a jailed absolute posix path.
   * Throws on absolute paths, `..` escapes, or empty input.
   */
  resolve(p) {
    if (typeof p !== 'string' || !p.trim()) {
      throw new Error('A non-empty "path" is required.');
    }
    let raw = p.trim().replace(/\\/g, '/');

    // Accept paths already prefixed with the workspace root (e.g. "/demo/x.js").
    if (raw === this.root) {
      raw = '';
    } else if (raw.startsWith(`${this.root}/`)) {
      raw = raw.slice(this.root.length + 1);
    }
    if (raw.startsWith('/')) {
      throw new Error(
        `Absolute paths are not allowed. Use a path relative to the workspace root ` +
          `(e.g. "index.html" or "src/game.js"). Received: ${p}`
      );
    }

    const abs = posix.normalize(posix.join(this.root, raw));
    if (abs !== this.root && !abs.startsWith(`${this.root}/`)) {
      throw new Error(`Path escapes the sandbox: ${p}`);
    }
    return abs;
  }

  /** Convert a jailed absolute path back to a display path. */
  toRelative(abs) {
    if (abs === this.root) return '.';
    return abs.startsWith(`${this.root}/`) ? abs.slice(this.root.length + 1) : abs;
  }

  /** True when the path (or a directory containing files) exists. */
  exists(p) {
    return this._has(this.resolve(p));
  }

  /** Internal existence check on an already-resolved absolute path. */
  _has(abs) {
    if (this.files.has(abs)) return true;
    const prefix = `${abs}/`;
    for (const key of this.files.keys()) if (key.startsWith(prefix)) return true;
    return false;
  }

  isFile(p) {
    return this.files.has(this.resolve(p));
  }

  write(p, content) {
    const abs = this.resolve(p);
    if (abs === this.root) throw new Error('The workspace root cannot be written as a file.');

    const text = content === undefined || content === null ? '' : String(content);
    const bytes = Buffer.byteLength(text);
    if (bytes > MAX_FILE_BYTES) {
      throw new Error(
        `Refusing to write ${this.toRelative(abs)}: ${bytes} bytes exceeds the ` +
          `${MAX_FILE_BYTES} byte per-file limit. Split it into smaller files.`
      );
    }
    if (!this.files.has(abs) && this.files.size >= MAX_TOTAL_FILES) {
      throw new Error(`Refusing to write: workspace file limit (${MAX_TOTAL_FILES}) reached.`);
    }

    this.files.set(abs, text);
    return { path: this.toRelative(abs), bytes, lines: text.split('\n').length };
  }

  read(p) {
    const abs = this.resolve(p);
    if (!this.files.has(abs)) {
      if (this._has(abs)) {
        const entries = this.list(abs).map((e) => e.path).join(', ');
        throw new Error(`${this.toRelative(abs)} is a directory. It contains: ${entries}`);
      }
      throw new Error(`File not found: ${this.toRelative(abs)}`);
    }
    return this.files.get(abs);
  }

  delete(p) {
    const abs = this.resolve(p);
    let removed = 0;
    for (const key of [...this.files.keys()]) {
      if (key === abs || key.startsWith(`${abs}/`)) {
        this.files.delete(key);
        removed++;
      }
    }
    if (removed === 0) throw new Error(`Nothing to delete at: ${this.toRelative(abs)}`);
    return { path: this.toRelative(abs), removed };
  }

  /** Direct children of a directory. Returns `[]` for an unknown directory. */
  list(p = '.') {
    const abs = this.resolve(p);
    if (this.files.has(abs)) {
      const content = this.files.get(abs);
      return [
        {
          name: posix.basename(abs),
          path: this.toRelative(abs),
          type: 'file',
          bytes: Buffer.byteLength(content),
        },
      ];
    }

    const prefix = abs === this.root ? `${this.root}/` : `${abs}/`;
    const dirs = new Map();
    const files = [];

    for (const [key, content] of this.files) {
      if (!key.startsWith(prefix)) continue;
      const rest = key.slice(prefix.length);
      const slash = rest.indexOf('/');
      if (slash === -1) {
        files.push({
          name: rest,
          path: this.toRelative(key),
          type: 'file',
          bytes: Buffer.byteLength(content),
        });
      } else {
        const dir = rest.slice(0, slash);
        dirs.set(dir, { name: dir, path: this.toRelative(`${prefix}${dir}`), type: 'directory' });
      }
    }

    return [...dirs.values(), ...files].sort((a, b) =>
      a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'directory' ? -1 : 1
    );
  }

  /** Nested tree (for the FileTree component). */
  tree(p = '.') {
    return this.list(p).map((entry) =>
      entry.type === 'directory' ? { ...entry, children: this.tree(entry.path) } : entry
    );
  }

  /**
   * Substring (or regex) search across text files.
   * Returns `[{ path, line, text }]` capped at `limit` matches.
   */
  search(query, { path = '.', regex = false, limit = 100 } = {}) {
    if (!query) throw new Error('A "query" string is required.');
    const abs = this.resolve(path);
    const prefix = abs === this.root ? `${this.root}/` : `${abs}/`;
    const matcher = regex ? new RegExp(query, 'i') : null;

    const matches = [];
    for (const [key, content] of this.files) {
      if (key !== abs && !key.startsWith(prefix)) continue;
      if (BINARY_EXT_RE.test(key)) continue;
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const hit = matcher
          ? matcher.test(lines[i])
          : lines[i].toLowerCase().includes(query.toLowerCase());
        if (hit) {
          matches.push({ path: this.toRelative(key), line: i + 1, text: lines[i].slice(0, 400) });
          if (matches.length >= limit) return matches;
        }
      }
    }
    return matches;
  }

  /** Every file as `[{ path, content }]` — used for persistence and preview. */
  snapshot() {
    return [...this.files.entries()]
      .map(([abs, content]) => ({ path: this.toRelative(abs), content }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  /** Restore from a snapshot (used to rehydrate a workspace). */
  loadSnapshot(snapshot = []) {
    this.files.clear();
    for (const file of snapshot) {
      if (file && typeof file.path === 'string') this.write(file.path, file.content ?? '');
    }
    return this.stats();
  }

  stats() {
    let bytes = 0;
    for (const content of this.files.values()) bytes += Buffer.byteLength(content);
    return { files: this.files.size, bytes, root: this.root };
  }
}

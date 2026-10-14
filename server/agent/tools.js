/**
 * Tool schemas + executors.
 *
 * The schemas are sent to the model as the OpenAI `tools` array (OpenRouter,
 * Poolside and Hugging Face all accept this exact shape). The executor binds
 * each tool to a VirtualFileSystem and returns a plain string, which becomes
 * the `role: "tool"` message content on the next turn of the loop.
 */

export const TOOL_SCHEMAS = [
  {
    type: 'function',
    function: {
      name: 'list_files',
      description:
        'List the files and directories in the workspace (recursively, depth-limited). ' +
        'Call this first to understand what already exists.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Directory to list, relative to the workspace root. Use "." for the root.',
          },
          recursive: { type: 'boolean', description: 'Recurse into subdirectories (default true).' },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description:
        'Read the full contents of a file. Always read a file before modifying it.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path relative to the workspace root.' },
        },
        required: ['path'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description:
        'Create a file or overwrite it completely. The parent directory is created ' +
        'automatically. Always provide the ENTIRE file content — never a partial diff.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path relative to the workspace root.' },
          content: { type: 'string', description: 'The complete file content.' },
        },
        required: ['path', 'content'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_file',
      description: 'Delete a file, or a whole directory and everything inside it.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File or directory path relative to the root.' },
        },
        required: ['path'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_files',
      description: 'Search file contents for a string or regular expression across the workspace.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Text or regular expression to search for.' },
          path: { type: 'string', description: 'Directory to search in. Defaults to the root.' },
          regex: { type: 'boolean', description: 'Treat the query as a regular expression.' },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ask_followup_question',
      description:
        'Ask the user a clarifying question when a decision genuinely blocks progress. ' +
        'Do not use this to avoid making reasonable decisions.',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'The question to ask the user.' },
        },
        required: ['question'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'attempt_completion',
      description:
        'Signal that the task is complete and verified. Call this LAST, after checking ' +
        'your own work. Include the entry file to preview.',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'What you built and how to play/use it.' },
          preview_path: {
            type: 'string',
            description: 'Path of the HTML file to load in the preview iframe (e.g. "index.html").',
          },
        },
        required: ['summary'],
        additionalProperties: false,
      },
    },
  },
];

/** Tools that mutate the workspace (useful for UI highlighting + confirmations). */
export const MUTATING_TOOLS = new Set(['write_file', 'delete_file']);

/** Tool names the executor knows how to run. */
export const KNOWN_TOOLS = new Set(TOOL_SCHEMAS.map((t) => t.function.name));

/** Render a recursive file listing as an indented tree string. */
function renderTree(vfs, dir, depth, maxDepth) {
  if (depth > maxDepth) return [];
  const lines = [];
  for (const entry of vfs.list(dir)) {
    const indent = '  '.repeat(depth);
    if (entry.type === 'directory') {
      lines.push(`${indent}${entry.name}/`);
      lines.push(...renderTree(vfs, entry.path, depth + 1, maxDepth));
    } else {
      lines.push(`${indent}${entry.name} (${entry.bytes} B)`);
    }
  }
  return lines;
}

/**
 * Bind the tools to a VirtualFileSystem.
 * Returns `execute(name, args) -> Promise<string>` where the string is the
 * tool result handed back to the model.
 */
export function createToolExecutor(vfs, { onEvent = () => {} } = {}) {
  async function runTool(name, a) {
    switch (name) {
      case 'list_files': {
        const dir = a.path || '.';
        const recursive = a.recursive !== false;
        const entries = vfs.list(dir);
        if (entries.length === 0) return `(empty) ${dir} contains no files yet.`;
        const body = recursive
          ? renderTree(vfs, dir, 0, 4).join('\n')
          : entries.map((e) => (e.type === 'directory' ? `${e.name}/` : e.name)).join('\n');
        const stats = vfs.stats();
        return `Contents of ${dir}:\n${body}\n\nWorkspace: ${stats.files} file(s), ${stats.bytes} bytes.`;
      }

      case 'read_file': {
        if (!a.path) throw new Error('read_file requires "path".');
        const content = vfs.read(a.path);
        const shown = content.length > 60000 ? `${content.slice(0, 60000)}\n…[truncated]` : content;
        return `Contents of ${a.path}:\n${shown}`;
      }

      case 'write_file': {
        if (!a.path) throw new Error('write_file requires "path".');
        const info = vfs.write(a.path, a.content ?? '');
        onEvent({ type: 'file_written', path: info.path, bytes: info.bytes });
        return `Wrote ${info.path} (${info.bytes} bytes, ${info.lines} lines).`;
      }

      case 'delete_file': {
        if (!a.path) throw new Error('delete_file requires "path".');
        const info = vfs.delete(a.path);
        onEvent({ type: 'file_deleted', path: info.path });
        return `Deleted ${info.path} (${info.removed} file(s) removed).`;
      }

      case 'search_files': {
        if (!a.query) throw new Error('search_files requires "query".');
        const matches = vfs.search(a.query, { path: a.path || '.', regex: !!a.regex });
        if (matches.length === 0) return `No matches for "${a.query}".`;
        const body = matches.map((m) => `${m.path}:${m.line}: ${m.text.trim()}`).join('\n');
        return `${matches.length} match(es) for "${a.query}":\n${body}`;
      }

      case 'ask_followup_question': {
        if (!a.question) throw new Error('ask_followup_question requires "question".');
        return `__ASK__${a.question}`;
      }

      case 'attempt_completion': {
        return `__COMPLETE__${a.summary || 'Task complete.'}`;
      }

      default:
        return (
          `Unknown tool "${name}". Available tools: ${[...KNOWN_TOOLS].join(', ')}. ` +
          `Call exactly one of them.`
        );
    }
  }

  /**
   * Tools never throw: a validation or file-system error is returned as the
   * tool result so the model can read it and correct itself on the next step.
   */
  return async function execute(name, args = {}) {
    const a = args && typeof args === 'object' ? args : {};
    try {
      return await runTool(name, a);
    } catch (error) {
      return `Error: ${error.message}`;
    }
  };
}

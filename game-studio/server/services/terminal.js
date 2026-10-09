import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const GAMES_DIR = join(__dirname, '../games');

// Active shell sessions per client
const sessions = new Map();

const BLOCKED = /\b(rm\s+-rf\s+\/|:\(\)\{|mkfs|dd\s+if=|shutdown|reboot|>\/dev\/sda)\b/;

export function startSession(clientId, ws, cwd = GAMES_DIR) {
  if (sessions.has(clientId)) return sessions.get(clientId);

  const shell = spawn('/bin/bash', ['-i'], {
    cwd,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      PS1: '\\[\\033[38;5;179m\\]game-studio\\[\\033[0m\\]:\\w$ ',
    },
  });

  const send = (data) => {
    if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'terminal_output', data }));
  };

  shell.stdout.on('data', (d) => send(d.toString()));
  shell.stderr.on('data', (d) => send(d.toString()));
  shell.on('close', () => {
    sessions.delete(clientId);
    send('\r\n[process exited]\r\n');
  });
  shell.on('error', (e) => send(`\r\n[error: ${e.message}]\r\n`));

  sessions.set(clientId, shell);
  send('🎬 AI Game Studio terminal ready. Type "ls" to explore games.\r\n');
  return shell;
}

export function writeToSession(clientId, data) {
  const shell = sessions.get(clientId);
  if (shell) shell.stdin.write(data);
}

export function resizeSession() {
  /* no-op without pty */
}

export function killSession(clientId) {
  const shell = sessions.get(clientId);
  if (shell) {
    shell.kill();
    sessions.delete(clientId);
  }
}

export function runCommand(clientId, ws, command) {
  const send = (data) => {
    if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'terminal_output', data }));
  };
  if (BLOCKED.test(command)) {
    send(`\r\n⛔ Blocked unsafe command.\r\n`);
    return;
  }
  send(`\r\n$ ${command}\r\n`);
  const proc = spawn('/bin/bash', ['-c', command], { cwd: GAMES_DIR });
  proc.stdout.on('data', (d) => send(d.toString()));
  proc.stderr.on('data', (d) => send(d.toString()));
  proc.on('close', (code) => send(`\r\n[exit ${code}]\r\n`));
}

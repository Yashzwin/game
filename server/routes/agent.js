import { Router } from 'express';
import { runAgent } from '../agent/loop.js';
import { publicAgentConfig, saveAgentConfig, resolveProvider } from '../agent/providers.js';
import {
  createWorkspace,
  getWorkspace,
  listWorkspaces,
  removeWorkspace,
  publicWorkspace,
  touch,
} from '../agent/store.js';
import { sendTo } from '../services/hub.js';

const router = Router();

/**
 * Broadcast one agent event to the browser that started the run.
 * Events are wrapped in an envelope so they never collide with the existing
 * terminal/generation WebSocket message types.
 */
export function makeEmitter(clientId) {
  return (event) => {
    if (clientId) sendTo(clientId, { type: 'agent_event', event });
  };
}

/** Kick off a run without blocking the HTTP response. */
async function startRun(workspace, { task, provider, model, clientId, maxSteps = 25 }) {
  if (workspace.running) {
    return { started: false, error: 'This workspace already has a run in progress.' };
  }
  workspace.running = true;
  workspace.status = 'running';
  workspace.summary = null;
  touch(workspace);

  const emit = makeEmitter(clientId);
  const resolved = resolveProvider(provider);

  if (!resolved.apiKey) {
    workspace.running = false;
    workspace.status = 'error';
    const error = `No API key for ${resolved.label}. Open Settings and paste a key for that provider.`;
    emit({ type: 'agent_error', error });
    return { started: false, error };
  }

  emit({ type: 'agent_start', workspaceId: workspace.id, provider: resolved.name, model: model || resolved.model, task });

  runAgent({
    workspace,
    task,
    provider: resolved.name,
    model: model || resolved.model,
    maxSteps,
    streaming: true,
    onEvent: emit,
  })
    .then((result) => {
      workspace.running = false;
      workspace.status = result.status;
      workspace.summary = result.summary || null;
      workspace.previewPath = result.previewPath || workspace.previewPath;
      touch(workspace);
      emit({
        type: 'agent_finished',
        status: result.status,
        steps: result.steps,
        summary: result.summary || null,
        previewPath: workspace.previewPath,
        files: workspace.vfs.snapshot().map((f) => f.path),
      });
    })
    .catch((error) => {
      workspace.running = false;
      workspace.status = 'error';
      touch(workspace);
      emit({ type: 'agent_error', error: error.message });
    });

  return { started: true, workspaceId: workspace.id, provider: resolved.name, model: model || resolved.model };
}

// ── Provider config ────────────────────────────────────────────────────────
router.get('/providers', (req, res) => {
  res.json(publicAgentConfig());
});

router.post('/config', (req, res) => {
  try {
    const { provider, keys, models } = req.body || {};
    saveAgentConfig({ provider, keys, models });
    res.json({ success: true, config: publicAgentConfig() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Workspaces ─────────────────────────────────────────────────────────────
router.get('/workspaces', (req, res) => {
  res.json({ workspaces: listWorkspaces().map((w) => publicWorkspace(w, { includeTree: false })) });
});

router.post('/workspaces', (req, res) => {
  const workspace = createWorkspace({ name: req.body?.name });
  res.json({ workspace: publicWorkspace(workspace) });
});

router.get('/workspaces/:id', (req, res) => {
  const workspace = getWorkspace(req.params.id);
  if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
  res.json({ workspace: publicWorkspace(workspace) });
});

router.delete('/workspaces/:id', (req, res) => {
  res.json({ success: removeWorkspace(req.params.id) });
});

// ── Virtual file system ────────────────────────────────────────────────────
router.get('/workspaces/:id/tree', (req, res) => {
  const workspace = getWorkspace(req.params.id);
  if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
  res.json({ tree: workspace.vfs.tree(), stats: workspace.vfs.stats() });
});

router.get('/workspaces/:id/file', (req, res) => {
  const workspace = getWorkspace(req.params.id);
  if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
  try {
    res.json({ path: req.query.path, content: workspace.vfs.read(String(req.query.path || '')) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/workspaces/:id/file', (req, res) => {
  const workspace = getWorkspace(req.params.id);
  if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
  try {
    const info = workspace.vfs.write(req.body?.path, req.body?.content ?? '');
    touch(workspace);
    res.json({ success: true, ...info });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/workspaces/:id/file', (req, res) => {
  const workspace = getWorkspace(req.params.id);
  if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
  try {
    res.json({ success: true, ...workspace.vfs.delete(String(req.query.path || '')) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── Run the agent ──────────────────────────────────────────────────────────
router.post('/workspaces/:id/run', async (req, res) => {
  const workspace = getWorkspace(req.params.id);
  if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

  const { task, provider, model, clientId, maxSteps } = req.body || {};
  if (!task || !String(task).trim()) return res.status(400).json({ error: 'task is required' });

  const result = await startRun(workspace, {
    task: String(task),
    provider,
    model,
    clientId,
    maxSteps: Number.isFinite(maxSteps) ? maxSteps : 25,
  });

  if (!result.started) return res.status(400).json({ error: result.error });
  res.json(result);
});

export default router;

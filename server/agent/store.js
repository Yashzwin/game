import { randomUUID } from 'crypto';
import { VirtualFileSystem } from './vfs.js';

/**
 * In-memory workspace registry.
 *
 * A "workspace" is one virtual file system + one conversation. It lives only in
 * the server process — restart and it's gone (no disk, no GitHub, by design).
 */

const workspaces = new Map();

export function createWorkspace({ name = 'Untitled project' } = {}) {
  const id = randomUUID();
  const short = id.slice(0, 8);
  const workspace = {
    id,
    name,
    vfs: new VirtualFileSystem(`/sandbox/${short}`),
    messages: [],
    status: 'idle',
    running: false,
    summary: null,
    previewPath: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  workspaces.set(id, workspace);
  return workspace;
}

export function getWorkspace(id) {
  return workspaces.get(id) || null;
}

export function listWorkspaces() {
  return [...workspaces.values()].sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );
}

export function removeWorkspace(id) {
  return workspaces.delete(id);
}

export function touch(workspace) {
  workspace.updatedAt = new Date().toISOString();
  return workspace;
}

/** JSON-safe summary of a workspace (no message history, no secrets). */
export function publicWorkspace(workspace, { includeTree = true } = {}) {
  return {
    id: workspace.id,
    name: workspace.name,
    status: workspace.status,
    running: workspace.running,
    summary: workspace.summary,
    previewPath: workspace.previewPath,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
    stats: workspace.vfs.stats(),
    previewUrl: workspace.previewPath
      ? `/sandbox/${workspace.id}/${workspace.previewPath}`
      : null,
    ...(includeTree ? { tree: workspace.vfs.tree() } : {}),
  };
}

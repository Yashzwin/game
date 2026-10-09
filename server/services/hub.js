// Central WebSocket hub — breaks the circular import between index.js and routes.

export const clients = new Map();

export function register(clientId, ws) {
  clients.set(clientId, ws);
}

export function unregister(clientId) {
  clients.delete(clientId);
}

export function getClient(clientId) {
  return clients.get(clientId);
}

/** Send a JSON message to one client (no-op if not connected). */
export function sendTo(clientId, data) {
  const ws = clients.get(clientId);
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(data));
    return true;
  }
  return false;
}

/** Send a JSON message to every connected client. */
export function broadcast(data) {
  const payload = JSON.stringify(data);
  for (const ws of clients.values()) {
    if (ws.readyState === 1) ws.send(payload);
  }
}

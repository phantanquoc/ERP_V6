import { WebSocket } from 'ws';

const clients = new Map<string, Set<WebSocket>>();

export const wsManager = {
  register(clientKey: string, ws: WebSocket): void {
    if (!clients.has(clientKey)) clients.set(clientKey, new Set());
    clients.get(clientKey)!.add(ws);
    console.log('[WS] Registered employee:', clientKey, 'connections:', clients.get(clientKey)!.size);
  },

  unregister(clientKey: string, ws: WebSocket): void {
    const set = clients.get(clientKey);
    if (set) {
      set.delete(ws);
      if (set.size === 0) clients.delete(clientKey);
    }
  },

  send(clientKey: string, payload: object): void {
    const set = clients.get(clientKey);
    if (!set || set.size === 0) return;
    const msg = JSON.stringify({ type: 'NOTIFICATION', data: payload });
    for (const ws of set) {
      try {
        if (ws.readyState === WebSocket.OPEN) ws.send(msg);
      } catch (_) {}
    }
    console.log('[WS] Pushed to employee:', clientKey, 'clients:', set.size);
  },

  broadcast(payload: object): void {
    const msg = JSON.stringify({ type: 'NOTIFICATION', data: payload });
    for (const set of clients.values()) {
      for (const ws of set) {
        try {
          if (ws.readyState === WebSocket.OPEN) ws.send(msg);
        } catch (_) {}
      }
    }
  },

  connectedCount(): number {
    let total = 0;
    for (const set of clients.values()) total += set.size;
    return total;
  },
};

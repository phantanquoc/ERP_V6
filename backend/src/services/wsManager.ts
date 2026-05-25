/**
 * WebSocket Manager
 * ─────────────────────────────────────────────────────────────────────────────
 * Production-ready WebSocket server for real-time notification delivery.
 *
 * Features:
 *   - JWT authentication via ?token= query param
 *   - Heartbeat ping/pong (30s) to detect stale connections
 *   - Multi-tab support (one user can have multiple connections)
 *   - Admin fallback key (u:<userId>) for users without employee record
 *   - Force disconnect (kick old sessions)
 *   - Graceful shutdown
 *
 * Message protocol (server → client):
 *   { type: 'NOTIFICATION', payload: { ... } }
 *   { type: 'FORCE_LOGOUT', payload: { reason: string } }
 *   { type: 'SERVER_SHUTDOWN', payload: { reason: string } }
 *
 * Client → server:
 *   { type: 'PING' }  →  server responds { type: 'PONG' }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { WebSocket, WebSocketServer, RawData } from 'ws';
import { IncomingMessage } from 'http';
import { Server as HttpServer } from 'http';
import { verifyAccessToken } from '@utils/helpers';
import logger from '@config/logger';
import prisma from '@config/database';

type WsClient = WebSocket & { clientKey?: string; isAlive?: boolean };

let wss: WebSocketServer | null = null;
const clientsByKey = new Map<string, Set<WsClient>>();
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

/* ─── Heartbeat ────────────────────────────────────────────────────────────── */

function startHeartbeat(): void {
  heartbeatInterval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws: WsClient) => {
      if (ws.isAlive === false) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30_000);
}

/* ─── Connection Handler ───────────────────────────────────────────────────── */

async function handleConnection(ws: WsClient, req: IncomingMessage): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const token = url.searchParams.get('token');

  if (!token) {
    ws.close(4001, 'No token provided');
    return;
  }

  let userId: string;
  try {
    const payload = verifyAccessToken(token);
    userId = payload.id;
  } catch {
    ws.close(4001, 'Invalid or expired token');
    return;
  }

  // Resolve userId → employeeId for notification routing
  try {
    const employee = await prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    });
    ws.clientKey = employee ? employee.id : `u:${userId}`;
  } catch (err) {
    logger.error('[WS] Failed to resolve employeeId', err);
    ws.close(4001, 'Internal error');
    return;
  }

  // Register client
  ws.isAlive = true;
  const key = ws.clientKey!;

  if (!clientsByKey.has(key)) {
    clientsByKey.set(key, new Set());
  }
  clientsByKey.get(key)!.add(ws);

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (data: RawData) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG' }));
      }
    } catch { /* ignore malformed */ }
  });

  ws.on('error', (err) => {
    logger.error(`[WS] Client error [key=${ws.clientKey}]`, err);
  });

  ws.on('close', () => {
    removeClient(ws);
  });

  logger.debug(`[WS] Client connected [key=${key}]`);
}

function removeClient(ws: WsClient): void {
  if (!ws.clientKey) return;
  const set = clientsByKey.get(ws.clientKey);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) clientsByKey.delete(ws.clientKey);
}

/* ─── Public API ───────────────────────────────────────────────────────────── */

/**
 * Initialize WebSocket server on the existing HTTP server.
 * Must be called AFTER server.listen().
 */
export function initWebSocket(server: HttpServer): void {
  if (wss) {
    logger.warn('[WS] Already initialized, skipping');
    return;
  }

  wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req: IncomingMessage, socket, head) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    if (url.pathname !== '/ws') return;

    wss!.handleUpgrade(req, socket, head, (ws: WebSocket) => {
      wss!.emit('connection', ws, req);
    });
  });

  wss.on('connection', handleConnection);
  wss.on('error', (err: Error) => {
    logger.error('[WS] Server error:', err);
  });

  startHeartbeat();
  logger.info('[WS] WebSocket server initialized on /ws');
}

/**
 * Push a notification payload to all connected clients of an employee.
 * @param clientKey - employeeId or "u:<userId>" for admin-only users
 */
export function pushNotification(clientKey: string, payload: object): void {
  const clients = clientsByKey.get(clientKey);
  if (!clients || clients.size === 0) return;

  const msg = JSON.stringify({ type: 'NOTIFICATION', payload });

  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(msg); } catch { /* ignore */ }
    }
  });
}

/**
 * Force-disconnect all WS connections for a user.
 * Sends FORCE_LOGOUT message before closing.
 */
export function forceDisconnectUser(clientKey: string, reason: string): void {
  const clients = clientsByKey.get(clientKey);
  if (!clients || clients.size === 0) return;

  const msg = JSON.stringify({ type: 'FORCE_LOGOUT', payload: { reason } });

  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(msg);
        ws.close(4002, reason);
      } catch { /* ignore */ }
    }
  });

  logger.info(`[WS] Force-disconnected key=${clientKey}: ${reason}`);
}

/**
 * Returns the number of unique connected client keys.
 */
export function getConnectedCount(): number {
  return clientsByKey.size;
}

/**
 * Gracefully shut down the WebSocket server.
 */
export function shutdownWebSocket(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  if (!wss) return;

  const shutdownMsg = JSON.stringify({
    type: 'SERVER_SHUTDOWN',
    payload: { reason: 'Server restarting' },
  });

  wss.clients.forEach((ws: WsClient) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(shutdownMsg);
      ws.close(1001, 'Server shutting down');
    }
  });

  wss.close(() => {
    logger.info('[WS] Server closed');
  });

  wss = null;
  clientsByKey.clear();
}

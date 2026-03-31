/**
 * WebSocket Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages real-time bidirectional communication with connected clients.
 *
 * Architecture:
 *   ┌─────────────┐     ws://     ┌──────────────┐
 *   │   Browser  │◄────────────►│  WebSocket   │
 *   │  (React)   │              │   Service    │
 *   └─────────────┘              └──────┬───────┘
 *                                       │ push()
 *                               ┌───────▼───────┐
 *                               │  Notification │
 *                               │   Service     │
 *                               └───────────────┘
 *
 * Key features:
 *   • One WebSocket server attached to the same HTTP server as Express
 *   • Clients identified by employeeId (extracted from JWT on connection)
 *   • Multiple browser tabs of the same user → all receive the same notification
 *   • Graceful degradation: WebSocket errors are logged, never crash the server
 *   • Heartbeat ping/pong to detect stale connections (proxy timeout)
 *
 * Message protocol:
 *   { type: 'NOTIFICATION', payload: { id, title, message, data, ... } }
 *   { type: 'PING' }
 *   { type: 'PONG' }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { WebSocket, WebSocketServer, RawData } from 'ws';
import { IncomingMessage } from 'http';
import { Server as HttpServer } from 'http';
import { verifyAccessToken } from '@utils/helpers';
import logger from '@config/logger';

/* ─────────────────────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────────────────────── */

/** Client connection keyed by employeeId — supports multiple tabs per user */
type WSClient = WebSocket & { employeeId?: string; isAlive?: boolean };

interface WsMessage {
  type: 'PING';
}

export interface WsNotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

/* ─────────────────────────────────────────────────────────────────────────────
   WebSocket Server Instance
   ───────────────────────────────────────────────────────────────────────────── */

let _wss: WebSocketServer | null = null;

/** Exported ref object — lets unit tests inject a mock _wss before calling broadcast/close */
export const wsState = { _wss };

/** Map: employeeId → Set of active WebSocket connections (handles multi-tab) */
export const clientsByEmployee = new Map<string, Set<WSClient>>();

/** Heartbeat interval handle (cleared on shutdown) */
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

/* ─────────────────────────────────────────────────────────────────────────────
   Heartbeat — detect stale connections
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Ping all connected clients every 30 seconds.
 * If a client fails to respond (isAlive === false), terminate it.
 *
 * This prevents connections from being killed by proxy/Nginx idle timeout
 * (typically 60s) and cleans up browser crashes / network drops.
 */
function startHeartbeat(): void {
  heartbeatInterval = setInterval(() => {
    _wss?.clients.forEach((ws: WSClient) => {
      if (ws.isAlive === false) {
        // Client did not respond to last ping → terminate stale connection
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30_000); // every 30 seconds
}

/* ─────────────────────────────────────────────────────────────────────────────
   Connection Handler
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Handles a new WebSocket client connection.
 *
 * Auth flow:
 *   1. Client connects with `?token=<jwt>` query param
 *   2. Server verifies the JWT
 *   3. On success: associate ws client with employeeId
 *   4. On failure: close with code 4001 (Authentication Failed)
 *
 * Connection URL example:
 *   ws://localhost:5001/ws?token=eyJhbGciOiJIUzI1NiJ9...
 *
 * @param ws   - The WebSocket connection
 * @param req  - The HTTP upgrade request (contains URL with JWT query param)
 */
async function handleConnection(ws: WSClient, req: IncomingMessage): Promise<void> {
  // ── Step 1: Authenticate via JWT query param ─────────────────────────────
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const token = url.searchParams.get('token');

  if (!token) {
    logger.warn('WebSocket connection rejected: no token provided');
    ws.close(4001, 'No token provided');
    return;
  }

  let userId: string;

  try {
    const payload = verifyAccessToken(token);
    userId = payload.id; // JWT sub = userId
  } catch {
    logger.warn('WebSocket connection rejected: invalid or expired token');
    ws.close(4001, 'Invalid or expired token');
    return;
  }

  // ── Step 2: Resolve userId → employeeId for notification routing ───────────
  // The JWT contains userId; notifications are keyed by employeeId.
  // We need to look up the employeeId from the user record.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const prisma = require('@config/database').default;
    const employee = await prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!employee) {
      ws.close(4001, 'No employee record for this user');
      return;
    }

    ws.employeeId = employee.id;
  } catch (err) {
    logger.error('WebSocket: failed to resolve employeeId', err);
    ws.close(4001, 'Internal error');
    return;
  }

  // ── Step 3: Register client ───────────────────────────────────────────────
  ws.isAlive = true;

  ws.on('pong', () => {
    // Client responded to our ping → connection is alive
    ws.isAlive = true;
  });

  ws.on('message', (data: RawData) => {
    try {
      const msg = JSON.parse(data.toString()) as WsMessage;
      if (msg.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG' }));
      }
    } catch {
      // Ignore malformed messages
    }
  });

  ws.on('error', (err) => {
    logger.error(`WebSocket client error [employeeId=${ws.employeeId}]`, err);
  });

  ws.on('close', () => {
    removeClient(ws);
    logger.info(`WebSocket client disconnected [employeeId=${ws.employeeId ?? 'unknown'}]`);
  });

  // ── Step 4: Store in registry ────────────────────────────────────────────
  // employeeId is guaranteed to be set at this point (either from step 1 payload
  // or overridden in step 2). Non-null assertion is safe here.
  const empId = ws.employeeId!;

  if (!clientsByEmployee.has(empId)) {
    clientsByEmployee.set(empId, new Set());
  }
  clientsByEmployee.get(empId)!.add(ws);

  logger.info(`WebSocket client connected [employeeId=${empId}]`);
}

/* ─────────────────────────────────────────────────────────────────────────────
   Client Management
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Removes a WebSocket client from the registry when it disconnects.
 * Cleans up empty sets to prevent memory leaks.
 */
function removeClient(ws: WSClient): void {
  if (!ws.employeeId) return;

  const set = clientsByEmployee.get(ws.employeeId);
  if (!set) return;

  set.delete(ws);

  if (set.size === 0) {
    clientsByEmployee.delete(ws.employeeId);
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Public API
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Initializes the WebSocket server, attaches it to the existing HTTP server,
 * and starts the heartbeat keepalive loop.
 *
 * ⚠️ Must be called AFTER `app.listen()` — requires the server reference.
 *
 * @param server - The HTTP server instance from `app.listen()`
 *
 * @example
 * ```typescript
 * const server = app.listen(PORT, () => { ... });
 * initWebSocket(server);
 * ```
 */
export function initWebSocket(server: HttpServer): void {
  if (_wss) {
    logger.warn('WebSocket server already initialized, skipping');
    return;
  }

  _wss = new WebSocketServer({
    server,           // Attach to existing HTTP server (same port as Express)
    path: '/ws',      // Only accept connections to /ws
    noServer: false,
  });

  // Handle HTTP upgrade requests for the /ws path
  server.on('upgrade', (req: IncomingMessage, socket: import('net').Socket, head: Buffer) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

    // Only handle /ws path — let other upgrade requests pass through
    if (url.pathname !== '/ws') return;

    _wss!.handleUpgrade(req, socket, head, (ws) => {
      _wss!.emit('connection', ws, req);
    });
  });

  _wss.on('connection', handleConnection);

  _wss.on('error', (err) => {
    logger.error('WebSocket server error:', err);
  });

  startHeartbeat();

  logger.info('WebSocket server initialized on /ws');
}

/**
 * Pushes a notification to all connected clients of a specific employee.
 *
 * Call this after saving a notification to the DB in NotificationService.
 *
 * @param employeeId   - The employee whose clients should receive the notification
 * @param notification - The notification payload (includes id, type, title, message)
 *
 * @example
 * ```typescript
 * const notification = await prisma.notification.create({ data: { ... } });
 * pushNotification(employeeId, notification);
 * ```
 */
export function pushNotification(
  employeeId: string,
  notification: WsNotificationPayload
): void {
  const clients = clientsByEmployee.get(employeeId);

  if (!clients || clients.size === 0) {
    // No active connection — notification is still saved to DB for later polling
    logger.debug(`No active WS client for employeeId=${employeeId}, skipping push`);
    return;
  }

  const payload = JSON.stringify({
    type: 'NOTIFICATION',
    payload: notification,
  });

  let sent = 0;
  let errors = 0;

  clients.forEach((ws: WSClient) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(payload);
        sent++;
      } catch (err) {
        errors++;
        logger.warn(`Failed to send WebSocket message to employeeId=${employeeId}`, err);
      }
    }
  });

  logger.debug(`WebSocket push: sent=${sent}, errors=${errors}, employeeId=${employeeId}`);
}

/**
 * Broadcasts a message to all connected clients (admin broadcasts, system alerts).
 *
 * @param message - The broadcast payload
 */
export function broadcast(message: Record<string, unknown>): void {
  if (!_wss) {
    logger.warn('WebSocket server not initialized, cannot broadcast');
    return;
  }

  const payload = JSON.stringify({ type: 'BROADCAST', payload: message });

  _wss.clients.forEach((ws: WSClient) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });

  logger.info(`WebSocket broadcast sent to ${_wss.clients.size} clients`);
}

/**
 * Returns the number of currently connected WebSocket clients (unique employees).
 * Useful for monitoring / health checks.
 */
export function getConnectedCount(): number {
  return clientsByEmployee.size;
}

/**
 * Gracefully shuts down the WebSocket server.
 * Call this during server shutdown to clean up connections.
 */
export function closeWebSocket(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  if (!_wss) return;

  // Notify all clients before closing
  _wss.clients.forEach((ws: WSClient) => {
    ws.send(JSON.stringify({ type: 'SERVER_SHUTDOWN', payload: { reason: 'Server restarting' } }));
    ws.close(1001, 'Server shutting down');
  });

  _wss.close(() => {
    logger.info('WebSocket server closed');
  });

  _wss = null;
  clientsByEmployee.clear();
}

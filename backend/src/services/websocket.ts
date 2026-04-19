import { IncomingMessage, Server as HttpServer } from 'http';
import { WebSocket, WebSocketServer, RawData } from 'ws';
import prisma from '@config/database';
import logger from '@config/logger';
import { verifyAccessToken } from '@utils/helpers';

type WSClient = WebSocket & { clientKey?: string; isAlive?: boolean };

interface WsMessage {
  type: 'PING' | 'PONG' | 'SUBSCRIBE_NOTIFICATIONS';
}

export interface WsNotificationPayload {
  id?: string;
  type: string;
  title: string;
  message: string;
  isRead?: boolean;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export const wsState: { server: WebSocketServer | null } = { server: null };
export const clientsByKey = new Map<string, Set<WSClient>>();

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

function removeClient(ws: WSClient): void {
  if (!ws.clientKey) return;
  const clients = clientsByKey.get(ws.clientKey);
  if (!clients) return;
  clients.delete(ws);
  if (clients.size === 0) {
    clientsByKey.delete(ws.clientKey);
  }
}

function startHeartbeat(): void {
  heartbeatInterval = setInterval(() => {
    wsState.server?.clients.forEach((client) => {
      const ws = client as WSClient;
      if (ws.isAlive === false) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30_000);
}

async function handleConnection(ws: WSClient, req: IncomingMessage): Promise<void> {
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

  const employee = await prisma.employee.findUnique({
    where: { userId },
    select: { id: true },
  });

  ws.clientKey = employee ? employee.id : `u:${userId}`;
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (data: RawData) => {
    try {
      const message = JSON.parse(data.toString()) as WsMessage;
      if (message.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG' }));
      }
    } catch {
      // Ignore malformed messages from clients.
    }
  });

  ws.on('close', () => {
    removeClient(ws);
  });

  ws.on('error', (error) => {
    logger.error(`WebSocket client error [key=${ws.clientKey ?? 'unknown'}]`, error);
  });

  if (!clientsByKey.has(ws.clientKey)) {
    clientsByKey.set(ws.clientKey, new Set());
  }
  clientsByKey.get(ws.clientKey)?.add(ws);
  logger.info(`WebSocket client connected [key=${ws.clientKey}]`);
}

export function initWebSocket(server: HttpServer): void {
  if (wsState.server) {
    logger.warn('WebSocket server already initialized, skipping');
    return;
  }

  wsState.server = new WebSocketServer({
    server,
    path: '/ws',
  });

  wsState.server.on('connection', (ws, req) => {
    void handleConnection(ws as WSClient, req);
  });

  wsState.server.on('error', (error) => {
    logger.error('WebSocket server error:', error);
  });

  startHeartbeat();
  logger.info('WebSocket server initialized on /ws');
}

export function pushNotification(clientKey: string, notification: WsNotificationPayload): void {
  const clients = clientsByKey.get(clientKey);
  if (!clients || clients.size === 0) {
    return;
  }

  const payload = JSON.stringify({
    type: 'NOTIFICATION',
    payload: notification,
  });

  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

export function broadcast(message: Record<string, unknown>): void {
  if (!wsState.server) {
    return;
  }

  const payload = JSON.stringify({
    type: 'BROADCAST',
    payload: message,
  });

  wsState.server.clients.forEach((client) => {
    const ws = client as WSClient;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

export function closeWebSocket(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  if (!wsState.server) {
    return;
  }

  wsState.server.clients.forEach((client) => {
    const ws = client as WSClient;
    if (ws.readyState === WebSocket.OPEN) {
      ws.close(1001, 'Server shutting down');
    }
  });

  wsState.server.close(() => {
    logger.info('WebSocket server closed');
  });

  wsState.server = null;
  clientsByKey.clear();
}

// @ts-nocheck — Jest mock objects intentionally don't satisfy strict WS types

/**
 * WebSocket Service — Unit Tests
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests cover the public API of the WebSocket service:
 *   • pushNotification() — send to correct employee, multi-tab, skip offline
 *   • broadcast()        — fan-out to all clients
 *   • getConnectedCount() — unique employee count
 *   • closeWebSocket()    — graceful shutdown + idempotency
 *
 * Strategy: mock `wss` directly (imported from the module) to bypass the
 * HTTP-server-dependent initWebSocket(). This tests the actual logic without
 * requiring a real Node.js HTTP server.
 * ─────────────────────────────────────────────────────────────────────────────
 */

jest.mock('ws', () => ({
  WebSocketServer: jest.fn(() => mockWssInstance),
  WebSocket: { OPEN: 1, CLOSED: 3 },
}));

jest.mock('@config/env', () => ({ isProduction: false, isDevelopment: true }));

jest.mock('@config/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@utils/helpers', () => ({
  verifyAccessToken: jest.fn(),
}));

jest.mock('@config/database', () => ({
  __esModule: true,
  default: { employee: { findUnique: jest.fn() } },
}));

import {
  pushNotification,
  broadcast,
  closeWebSocket,
  getConnectedCount,
  clientsByEmployee,
  wsState,
} from '@services/websocket';
import logger from '@config/logger';

describe('WebSocket Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clientsByEmployee.clear();
  });

  afterEach(() => {
    closeWebSocket();
  });

  /* ─── pushNotification ──────────────────────────────────────────────────── */

  describe('pushNotification', () => {
    it('should log debug message when no client is connected for the employee', () => {
      pushNotification('emp-none', {
        id: 'n1',
        type: 'TASK',
        title: 'Test',
        message: 'Hello',
        isRead: false,
        createdAt: '2026-03-31T00:00:00.000Z',
      });

      expect(logger.debug).toHaveBeenCalledWith(
        'No active WS client for employeeId=emp-none, skipping push'
      );
    });

    it('should send notification to all connected clients of the employee', () => {
      const ws1 = { send: jest.fn(), readyState: 1 };
      const ws2 = { send: jest.fn(), readyState: 1 };
      clientsByEmployee.set('emp-1', new Set([ws1, ws2]));

      pushNotification('emp-1', {
        id: 'n2',
        type: 'TASK',
        title: 'Nhiệm vụ mới',
        message: 'Bạn có một nhiệm vụ mới',
        isRead: false,
        createdAt: '2026-03-31T00:00:00.000Z',
      });

      expect(ws1.send).toHaveBeenCalledTimes(1);
      expect(ws2.send).toHaveBeenCalledTimes(1);

      const payload = JSON.parse(ws1.send.mock.calls[0][0]);
      expect(payload.type).toBe('NOTIFICATION');
      expect(payload.payload.id).toBe('n2');
      expect(payload.payload.title).toBe('Nhiệm vụ mới');
    });

    it('should skip clients that are not in OPEN state', () => {
      const wsOpen = { send: jest.fn(), readyState: 1 };
      const wsClosed = { send: jest.fn(), readyState: 3 }; // CLOSED
      clientsByEmployee.set('emp-2', new Set([wsOpen, wsClosed]));

      pushNotification('emp-2', {
        id: 'n3',
        type: 'PAYROLL',
        title: 'Lương tháng',
        message: 'Lương đã sẵn sàng',
        isRead: false,
        createdAt: '2026-03-31T00:00:00.000Z',
      });

      expect(wsOpen.send).toHaveBeenCalledTimes(1);
      expect(wsClosed.send).not.toHaveBeenCalled();
    });

    it('should handle send errors gracefully without throwing', () => {
      const ws = {
        send: jest.fn(() => { throw new Error('Send failed'); }),
        readyState: 1,
      };
      clientsByEmployee.set('emp-3', new Set([ws]));

      expect(() => pushNotification('emp-3', {
        id: 'n4',
        type: 'EVALUATION',
        title: 'Test',
        message: 'Test',
        isRead: false,
        createdAt: '2026-03-31T00:00:00.000Z',
      })).not.toThrow();

      expect(logger.warn).toHaveBeenCalled();
    });

    it('should deliver notification to all tabs of the same employee', () => {
      const tab1 = { send: jest.fn(), readyState: 1 };
      const tab2 = { send: jest.fn(), readyState: 1 };
      const tab3 = { send: jest.fn(), readyState: 1 };
      clientsByEmployee.set('emp-multi', new Set([tab1, tab2, tab3]));

      pushNotification('emp-multi', {
        id: 'n5',
        type: 'NOTIFICATION',
        title: 'Thông báo',
        message: 'Bạn có thông báo mới',
        isRead: false,
        createdAt: '2026-03-31T00:00:00.000Z',
      });

      expect(tab1.send).toHaveBeenCalledTimes(1);
      expect(tab2.send).toHaveBeenCalledTimes(1);
      expect(tab3.send).toHaveBeenCalledTimes(1);
    });

    it('should only send to the targeted employee', () => {
      const wsTarget = { send: jest.fn(), readyState: 1 };
      const wsOther = { send: jest.fn(), readyState: 1 };
      clientsByEmployee.set('emp-target', new Set([wsTarget]));
      clientsByEmployee.set('emp-other', new Set([wsOther]));

      pushNotification('emp-target', {
        id: 'n6',
        type: 'TASK',
        title: 'Only for target',
        message: 'Not for other',
        isRead: false,
        createdAt: '2026-03-31T00:00:00.000Z',
      });

      expect(wsTarget.send).toHaveBeenCalledTimes(1);
      expect(wsOther.send).not.toHaveBeenCalled();
    });
  });

  /* ─── broadcast ─────────────────────────────────────────────────────────── */

  describe('broadcast', () => {
    it('should send message to all connected clients via wss.clients', () => {
      const ws1 = { send: jest.fn(), readyState: 1 };
      const ws2 = { send: jest.fn(), readyState: 1 };
      const mockClients = new Set([ws1, ws2]);

      // Inject mock _wss via the exported wsState ref
      wsState._wss = { clients: mockClients } as any;

      broadcast({ alert: 'System maintenance in 5 minutes' });

      expect(ws1.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'BROADCAST', payload: { alert: 'System maintenance in 5 minutes' } })
      );
      expect(ws2.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'BROADCAST', payload: { alert: 'System maintenance in 5 minutes' } })
      );

      wsState._wss = null;
    });

    it('should skip closed clients during broadcast', () => {
      const wsOpen = { send: jest.fn(), readyState: 1 };
      const wsClosed = { send: jest.fn(), readyState: 3 };
      const mockClients = new Set([wsOpen, wsClosed]);
      wsState._wss = { clients: mockClients } as any;

      broadcast({ msg: 'ping' });

      expect(wsOpen.send).toHaveBeenCalledTimes(1);
      expect(wsClosed.send).not.toHaveBeenCalled();

      wsState._wss = null;
    });

    it('should log warning and do nothing if wss is null (not initialized)', () => {
      wsState._wss = null;

      broadcast({ msg: 'test' });

      expect(logger.warn).toHaveBeenCalledWith(
        'WebSocket server not initialized, cannot broadcast'
      );
    });
  });

  /* ─── getConnectedCount ─────────────────────────────────────────────────── */

  describe('getConnectedCount', () => {
    it('should return number of unique employees (not total connections)', () => {
      // 2 tabs for emp-x, 1 tab for emp-y → 2 unique employees
      clientsByEmployee.set('emp-x', new Set([{}, {}]));
      clientsByEmployee.set('emp-y', new Set([{}]));

      expect(getConnectedCount()).toBe(2);
    });

    it('should return 0 when no clients connected', () => {
      expect(getConnectedCount()).toBe(0);
    });

    it('should return 1 when one employee has multiple tabs open', () => {
      clientsByEmployee.set('emp-solo', new Set([{}, {}, {}, {}]));

      expect(getConnectedCount()).toBe(1);
    });
  });

  /* ─── closeWebSocket ─────────────────────────────────────────────────────── */

  describe('closeWebSocket', () => {
    it('should notify all clients with SERVER_SHUTDOWN and close them', () => {
      const ws = {
        send: jest.fn(),
        close: jest.fn(),
        readyState: 1,
        employeeId: 'emp-1',
      };
      const mockClients = new Set([ws]);
      wsState._wss = {
        clients: mockClients,
        close: jest.fn((cb?: () => void) => cb?.()),
      } as any;

      closeWebSocket();

      expect(ws.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'SERVER_SHUTDOWN', payload: { reason: 'Server restarting' } })
      );
      expect(ws.close).toHaveBeenCalledWith(1001, 'Server shutting down');
    });

    it('should clear the clientsByEmployee map after close', () => {
      clientsByEmployee.set('emp-1', new Set([{}] as any));
      wsState._wss = {
        clients: new Set(),
        close: jest.fn((cb?: () => void) => cb?.()),
      } as any;

      closeWebSocket();

      expect(clientsByEmployee.size).toBe(0);
    });

    it('should be safe to call multiple times (idempotent)', () => {
      wsState._wss = null;
      closeWebSocket();
      expect(() => closeWebSocket()).not.toThrow();
    });
  });
});

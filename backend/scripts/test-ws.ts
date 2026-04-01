/**
 * WebSocket Manual Test Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Dùng để test WebSocket notification end-to-end từ terminal.
 *
 * Cách dùng:
 *   npx ts-node -r tsconfig-paths/register scripts/test-ws.ts
 *
 * Hoặc truyền thông số qua env:
 *   WS_EMAIL=admin@test.com WS_PASSWORD=123456 WS_URL=ws://localhost:5000 \
 *     npx ts-node -r tsconfig-paths/register scripts/test-ws.ts
 *
 * Sau khi kết nối, script sẽ in ra mọi message nhận được từ server.
 * Để trigger notification: dùng curl hoặc Postman gọi endpoint debug bên dưới.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import WebSocket from 'ws';

/* ─── Config (override bằng env vars) ───────────────────────────────────────── */
const API_URL  = process.env.WS_API_URL  || 'http://localhost:5000';
const WS_URL   = process.env.WS_URL      || 'ws://localhost:5000';
const EMAIL    = process.env.WS_EMAIL    || 'admin@example.com';
const PASSWORD = process.env.WS_PASSWORD || '123456';

/* ─── Colors for terminal output ───────────────────────────────────────────── */
const C = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  cyan:   '\x1b[36m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  gray:   '\x1b[90m',
  bold:   '\x1b[1m',
};

function log(color: string, label: string, msg: string) {
  const time = new Date().toLocaleTimeString('vi-VN');
  console.log(`${C.gray}[${time}]${C.reset} ${color}${C.bold}${label}${C.reset} ${msg}`);
}

/* ─── Step 1: Login để lấy JWT ─────────────────────────────────────────────── */
async function getJwt(): Promise<string> {
  log(C.cyan, 'LOGIN', `POST ${API_URL}/api/auth/login`);

  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed (${res.status}): ${text}`);
  }

  const body = await res.json() as { success: boolean; data?: { accessToken?: string } };

  if (!body.success || !body.data?.accessToken) {
    throw new Error(`Login response missing accessToken: ${JSON.stringify(body)}`);
  }

  log(C.green, 'JWT ✓', `accessToken nhận được (${body.data.accessToken.slice(0, 30)}...)`);
  return body.data.accessToken;
}

/* ─── Step 2: Kết nối WebSocket ─────────────────────────────────────────────── */
function connectWs(token: string): void {
  const url = `${WS_URL}/ws?token=${encodeURIComponent(token)}`;
  log(C.cyan, 'CONNECT', url);

  const ws = new WebSocket(url);

  ws.on('open', () => {
    log(C.green, 'OPEN ✓', 'Kết nối WebSocket thành công!');
    console.log('');
    console.log(`${C.yellow}${C.bold}Đang lắng nghe notification...${C.reset}`);
    console.log(`${C.gray}Dùng curl để trigger test notification:${C.reset}`);
    console.log('');
    console.log(
      `${C.cyan}  curl -s -X POST ${API_URL}/api/debug/push-notification \\${C.reset}`,
    );
    console.log(
      `${C.cyan}    -H "Authorization: Bearer <ACCESS_TOKEN>" \\${C.reset}`,
    );
    console.log(
      `${C.cyan}    -H "Content-Type: application/json" \\${C.reset}`,
    );
    console.log(
      `${C.cyan}    -d '{"title":"Test 🔔","message":"Hello từ debug endpoint!"}' | jq${C.reset}`,
    );
    console.log('');
  });

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString()) as Record<string, unknown>;
      const type = data.type as string;

      if (type === 'PONG') {
        log(C.gray, 'PONG', '← heartbeat response');
        return;
      }

      console.log('');
      log(C.green, `MSG [${type}]`, '↓');
      console.log(JSON.stringify(data, null, 2));
      console.log('');
    } catch {
      log(C.yellow, 'RAW', raw.toString());
    }
  });

  ws.on('ping', () => {
    log(C.gray, 'PING', '← server heartbeat (auto-pong sent)');
  });

  ws.on('close', (code, reason) => {
    log(C.red, 'CLOSE', `code=${code} reason=${reason.toString() || '(none)'}`);
    process.exit(0);
  });

  ws.on('error', (err) => {
    log(C.red, 'ERROR', err.message);
    process.exit(1);
  });

  // Keep-alive: gửi PING mỗi 25 giây (trước heartbeat server 30s)
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'PING' }));
      log(C.gray, 'PING →', 'keep-alive sent');
    }
  }, 25_000);

  // Ctrl+C → đóng gracefully
  process.on('SIGINT', () => {
    clearInterval(pingInterval);
    log(C.yellow, 'EXIT', 'Đóng kết nối...');
    ws.close(1000, 'Client closed');
  });
}

/* ─── Main ──────────────────────────────────────────────────────────────────── */
(async () => {
  console.log('');
  console.log(`${C.bold}${C.cyan}╔══════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║   WebSocket Notification Test Tool   ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════╝${C.reset}`);
  console.log('');

  try {
    const token = await getJwt();
    connectWs(token);
  } catch (err) {
    log(C.red, 'FATAL', (err as Error).message);
    process.exit(1);
  }
})();

import { checkHealth } from '@utils/healthChecks';

describe('checkHealth', () => {
  const ok = () => Promise.resolve('ok');

  it('reports OK when all dependencies are up', async () => {
    const report = await checkHealth({
      queryDb: ok,
      pingRedis: ok,
      pingAi: () => Promise.resolve(new Response('ok')),
    });

    expect(report.status).toBe('OK');
    expect(report.checks.database.status).toBe('up');
    expect(report.checks.redis.status).toBe('up');
    expect(report.checks.aiService.status).toBe('up');
  });

  it('reports DEGRADED with per-dependency detail when one is down', async () => {
    const report = await checkHealth({
      queryDb: ok,
      pingRedis: () => Promise.reject(new Error('ECONNREFUSED')),
      pingAi: () => Promise.resolve(new Response('ok')),
    });

    expect(report.status).toBe('DEGRADED');
    expect(report.checks.redis.status).toBe('down');
    expect(report.checks.redis.error).toContain('ECONNREFUSED');
    expect(report.checks.database.status).toBe('up');
  });
});

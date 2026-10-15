import { env } from '@config/env';

export type DependencyStatus = 'up' | 'down';

export interface DependencyCheck {
  status: DependencyStatus;
  latencyMs: number;
  error?: string;
}

export interface HealthReport {
  status: 'OK' | 'DEGRADED';
  timestamp: string;
  checks: {
    database: DependencyCheck;
    redis: DependencyCheck;
    aiService: DependencyCheck;
  };
}

export interface HealthDeps {
  queryDb: () => Promise<unknown>;
  pingRedis: () => Promise<unknown>;
  pingAi: (signal: AbortSignal) => Promise<unknown>;
}

async function runCheck(fn: () => Promise<unknown>): Promise<DependencyCheck> {
  const start = Date.now();
  try {
    await fn();
    return { status: 'up', latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: 'down',
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ponytail: sequential checks (simplest correct ordering); parallelize with
// Promise.all if health latency ever matters.
export async function checkHealth(deps: HealthDeps): Promise<HealthReport> {
  const database = await runCheck(deps.queryDb);
  const redis = await runCheck(deps.pingRedis);
  const aiService = await runCheck(() => deps.pingAi(AbortSignal.timeout(3000)));
  const allUp = database.status === 'up' && redis.status === 'up' && aiService.status === 'up';
  return {
    status: allUp ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    checks: { database, redis, aiService },
  };
}

export const defaultHealthDeps: HealthDeps = {
  // Lazy requires so the util stays importable without a live DB in tests
  queryDb: async () => {
    const { default: prisma } = await import('@config/database');
    await prisma.$queryRaw`SELECT 1`;
  },
  pingRedis: async () => {
    const { default: redis } = await import('@config/redis');
    const pong = await redis.ping();
    if (pong !== 'PONG') throw new Error(`Unexpected PING reply: ${pong}`);
  },
  pingAi: async (signal: AbortSignal) => {
    const res = await fetch(`${env.AI_SERVICE_URL}/health`, { signal });
    if (!res.ok) throw new Error(`AI service /health -> HTTP ${res.status}`);
  },
};

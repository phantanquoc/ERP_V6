/**
 * evaluationCron.ts
 *
 * Scheduled jobs for employee evaluation reminders and maintenance.
 * All jobs use pg_try_advisory_lock to prevent duplicate runs in multi-instance deployments.
 *
 * Jobs:
 *  - evaluationReminderD7  — 09:00 daily — remind employees 7 days before month end
 *  - evaluationReminderD3  — 09:00 daily — remind supervisors 3 days before month end
 *  - evaluationDailySync   — 03:00 daily — sync evaluation details for current month
 *  - evaluationPeerInviteExpiry — 03:00 daily — expire pending peer invites
 */

import cron from 'node-cron';
import prisma from '@config/database';
import logger from '@config/logger';
import notificationService from '@services/notificationService';
import evaluationPeerFeedbackService from '@services/evaluationPeerFeedbackService';
import employeeEvaluationService from '@services/employeeEvaluationService';
import { NotificationEvent, EvaluationStatus } from '@types';

// ─── Advisory lock IDs ──────────────────────────────────────────────────────
// Must be unique integers per job. We use a stable base offset to avoid
// collisions with other advisory lock consumers in the app.
const LOCK_BASE = 0x45564c_000000n; // 'EVL' prefix
const LOCK_REMINDER_D7 = LOCK_BASE + 1n;
const LOCK_REMINDER_D3 = LOCK_BASE + 2n;
const LOCK_DAILY_SYNC = LOCK_BASE + 3n;
const LOCK_PEER_EXPIRY = LOCK_BASE + 4n;

/**
 * Try to acquire a session-level advisory lock. Returns true if acquired.
 * The lock is released automatically when the connection is returned to the pool.
 */
async function tryAdvisoryLock(lockId: bigint): Promise<boolean> {
  const result = await prisma.$queryRawUnsafe<[{ pg_try_advisory_lock: boolean }]>(
    `SELECT pg_try_advisory_lock($1)`,
    lockId
  );
  return result[0]?.pg_try_advisory_lock === true;
}

async function releaseAdvisoryLock(lockId: bigint): Promise<void> {
  await prisma.$queryRawUnsafe(
    `SELECT pg_advisory_unlock($1)`,
    lockId
  );
}

/**
 * Returns the last calendar day of the given month/year.
 */
function lastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0); // day=0 of next month = last day of current
}

// ─── evaluationReminderD7 ────────────────────────────────────────────────────

async function evaluationReminderD7(): Promise<void> {
  const acquired = await tryAdvisoryLock(LOCK_REMINDER_D7);
  if (!acquired) {
    logger.debug('evaluationReminderD7: lock not acquired, skipping');
    return;
  }

  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const lastDay = lastDayOfMonth(year, month);
    const daysUntilEnd = Math.ceil((lastDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilEnd !== 7) {
      logger.debug(`evaluationReminderD7: today is ${daysUntilEnd} days before month end, skipping`);
      return;
    }

    const period = `${year}-${String(month).padStart(2, '0')}`;

    // Find all SELF_PENDING evaluations for the current period
    const pendingEvaluations = await prisma.evaluation.findMany({
      where: { period, status: EvaluationStatus.SELF_PENDING },
      include: { employee: true },
    });

    logger.info(`evaluationReminderD7: found ${(pendingEvaluations as any[]).length} SELF_PENDING evaluations for ${period}`);

    for (const evaluation of pendingEvaluations as any[]) {
      try {
        await notificationService.notify(NotificationEvent.EVALUATION_REMINDER_SELF_PENDING, {
          targetEmployeeIds: [evaluation.employeeId],
          entityId: evaluation.id,
          metadata: { evaluationId: evaluation.id, period, daysUntilEnd: 7 },
        });
      } catch (err) {
        logger.warn(`evaluationReminderD7: failed to notify employee ${evaluation.employeeId}:`, err);
      }
    }

    logger.info(`evaluationReminderD7: completed for period ${period}`);
  } catch (err) {
    logger.error('evaluationReminderD7 error:', err);
  } finally {
    await releaseAdvisoryLock(LOCK_REMINDER_D7);
  }
}

// ─── evaluationReminderD3 ────────────────────────────────────────────────────

async function evaluationReminderD3(): Promise<void> {
  const acquired = await tryAdvisoryLock(LOCK_REMINDER_D3);
  if (!acquired) {
    logger.debug('evaluationReminderD3: lock not acquired, skipping');
    return;
  }

  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const lastDay = lastDayOfMonth(year, month);
    const daysUntilEnd = Math.ceil((lastDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilEnd !== 3) {
      logger.debug(`evaluationReminderD3: today is ${daysUntilEnd} days before month end, skipping`);
      return;
    }

    const period = `${year}-${String(month).padStart(2, '0')}`;

    // Find all evaluations in SUPERVISOR1_PENDING or SUPERVISOR2_PENDING for current period
    const pendingEvaluations = await prisma.evaluation.findMany({
      where: {
        period,
        status: { in: [EvaluationStatus.SUPERVISOR1_PENDING, EvaluationStatus.SUPERVISOR2_PENDING] },
      },
      include: {
        employee: {
          include: {
            user: { select: { id: true, supervisor1Id: true, supervisor2Id: true } },
          },
        },
      },
    } as any);

    // Collect unique supervisor IDs → their employee IDs for notification
    const supervisorUserIds = new Set<string>();

    for (const evaluation of pendingEvaluations as any[]) {
      if (evaluation.status === EvaluationStatus.SUPERVISOR1_PENDING && evaluation.employee.user?.supervisor1Id) {
        supervisorUserIds.add(evaluation.employee.user.supervisor1Id);
      }
      if (evaluation.status === EvaluationStatus.SUPERVISOR2_PENDING && evaluation.employee.user?.supervisor2Id) {
        supervisorUserIds.add(evaluation.employee.user.supervisor2Id);
      }
    }

    logger.info(`evaluationReminderD3: notifying ${supervisorUserIds.size} supervisors for period ${period}`);

    for (const supervisorUserId of supervisorUserIds) {
      try {
        const supervisorUser = await prisma.user.findUnique({
          where: { id: supervisorUserId },
          include: { employees: { select: { id: true } } },
        });
        const employeeId = (supervisorUser as any)?.employees?.id;
        if (!employeeId) continue;

        await notificationService.notify(NotificationEvent.EVALUATION_REMINDER_SUPERVISOR_PENDING, {
          targetEmployeeIds: [employeeId],
          entityId: supervisorUserId,
          metadata: { period, daysUntilEnd: 3 },
        });
      } catch (err) {
        logger.warn(`evaluationReminderD3: failed to notify supervisor ${supervisorUserId}:`, err);
      }
    }

    logger.info(`evaluationReminderD3: completed for period ${period}`);
  } catch (err) {
    logger.error('evaluationReminderD3 error:', err);
  } finally {
    await releaseAdvisoryLock(LOCK_REMINDER_D3);
  }
}

// ─── evaluationDailySync ─────────────────────────────────────────────────────

async function evaluationDailySync(): Promise<void> {
  const acquired = await tryAdvisoryLock(LOCK_DAILY_SYNC);
  if (!acquired) {
    logger.debug('evaluationDailySync: lock not acquired, skipping');
    return;
  }

  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const period = `${year}-${String(month).padStart(2, '0')}`;

    logger.info(`evaluationDailySync: syncing evaluation details for ${period}`);

    const evaluations = await prisma.evaluation.findMany({
      where: { period },
      select: { id: true },
    });

    let synced = 0;
    for (const evaluation of evaluations) {
      try {
        await employeeEvaluationService.syncEvaluationDetails(evaluation.id);
        synced++;
      } catch (err) {
        logger.warn(`evaluationDailySync: failed to sync evaluation ${evaluation.id}:`, err);
      }
    }

    logger.info(`evaluationDailySync: synced ${synced}/${evaluations.length} evaluations for ${period}`);
  } catch (err) {
    logger.error('evaluationDailySync error:', err);
  } finally {
    await releaseAdvisoryLock(LOCK_DAILY_SYNC);
  }
}

// ─── evaluationPeerInviteExpiry ───────────────────────────────────────────────

async function evaluationPeerInviteExpiry(): Promise<void> {
  const acquired = await tryAdvisoryLock(LOCK_PEER_EXPIRY);
  if (!acquired) {
    logger.debug('evaluationPeerInviteExpiry: lock not acquired, skipping');
    return;
  }

  try {
    logger.info('evaluationPeerInviteExpiry: expiring pending invites');
    await evaluationPeerFeedbackService.expirePendingInvites();
    logger.info('evaluationPeerInviteExpiry: completed');
  } catch (err) {
    logger.error('evaluationPeerInviteExpiry error:', err);
  } finally {
    await releaseAdvisoryLock(LOCK_PEER_EXPIRY);
  }
}

// ─── Public init ─────────────────────────────────────────────────────────────

export function initEvaluationCron(): void {
  // D-7 reminder: daily at 09:00
  cron.schedule('0 9 * * *', () => evaluationReminderD7());

  // D-3 reminder: daily at 09:00
  cron.schedule('0 9 * * *', () => evaluationReminderD3());

  // Daily sync: daily at 03:00
  cron.schedule('0 3 * * *', () => evaluationDailySync());

  // Peer invite expiry: daily at 03:00
  cron.schedule('0 3 * * *', () => evaluationPeerInviteExpiry());

  logger.info('Evaluation cron jobs initialized');
}

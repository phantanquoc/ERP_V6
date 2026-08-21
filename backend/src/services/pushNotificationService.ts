import webpush from 'web-push';
import prisma from '@config/database';
import logger from '@config/logger';

// Initialize VAPID keys at module load time
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
  console.warn(
    '[PushNotificationService] VAPID keys are not configured. Web push notifications will not be sent. ' +
    'Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT in your .env file. ' +
    'Generate keys with: npx web-push generate-vapid-keys'
  );
} else {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

class PushNotificationService {
  /**
   * Send a push notification to all subscriptions for a given employeeId.
   * Resolves employeeId -> userId -> push subscriptions.
   * Uses Promise.allSettled so one failed send does not block others.
   */
  async sendPushToEmployee(employeeId: string, title: string, message: string, url?: string): Promise<void> {
    if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
      return;
    }

    try {
      // Resolve employeeId -> userId
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { userId: true },
      });

      if (!employee?.userId) {
        return;
      }

      // Fetch all push subscriptions for this user
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId: employee.userId },
      });

      if (subscriptions.length === 0) {
        return;
      }

      const payload = JSON.stringify({ title, body: message, url: url || '/' });

      // Fan-out to all subscriptions in parallel
      await Promise.allSettled(
        subscriptions.map(async (sub) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth,
                },
              },
              payload
            );
          } catch (error: any) {
            // 404 or 410 means the subscription is expired/invalid — clean it up
            if (error?.statusCode === 404 || error?.statusCode === 410) {
              await prisma.pushSubscription
                .delete({ where: { id: sub.id } })
                .catch((err) => {
                  logger.warn(`[PushNotificationService] Failed to clean up expired subscription ${sub.id}`, err);
                });
            } else {
              console.error(
                `[PushNotificationService] Failed to send push to subscription ${sub.id}:`,
                error?.message ?? error
              );
            }
          }
        })
      );
    } catch (error: any) {
      console.error(
        '[PushNotificationService] Error in sendPushToEmployee:',
        error?.message ?? error
      );
    }
  }

  /**
   * Save or update a push subscription for a user (upsert on userId+endpoint).
   */
  async saveSubscription(
    userId: string,
    endpoint: string,
    p256dh: string,
    auth: string
  ): Promise<void> {
    await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: { userId, endpoint },
      },
      update: {
        p256dh,
        auth,
        updatedAt: new Date(),
      },
      create: {
        userId,
        endpoint,
        p256dh,
        auth,
      },
    });
  }

  /**
   * Remove a push subscription for a user by endpoint. No-op if not found.
   */
  async removeSubscription(userId: string, endpoint: string): Promise<void> {
    try {
      await prisma.pushSubscription.delete({
        where: {
          userId_endpoint: { userId, endpoint },
        },
      });
    } catch (error: any) {
      // P2025 = record not found — that is acceptable (idempotent delete)
      if (error?.code !== 'P2025') {
        console.error(
          '[PushNotificationService] Error removing subscription:',
          error?.message ?? error
        );
      }
    }
  }
}

export default new PushNotificationService();
